import { randomUUID } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import type {
  Article,
  ArticleServiceController,
  CreateArticleRequest,
  DeleteArticleRequest,
  FavoriteArticleRequest,
  GetArticleRequest,
  ListArticlesRequest,
  ListArticlesResponse,
  LookupArticleRequest,
  UnfavoriteArticleRequest,
  UpdateArticleRequest,
} from '@repo/proto/nestjs';
import { ArticleServiceControllerMethods } from '@repo/proto/nestjs';
import { CallerId } from '../auth/caller.decorator';
import { Public } from '../auth/public.decorator';
import { invalidArgument, notFound, permissionDenied } from '../common/errors';
import { toArticleProto } from '../common/mappers';
import {
  clampPageSize,
  decodePageToken,
  encodePageToken,
} from '../common/pagination';
import { parseArticleName } from '../common/resource-names';
import { CreateArticleSchema, UpdateArticleSchema } from '../common/schemas';
import { randomSuffix, slugify } from '../common/slug';
import { validate } from '../common/validation';
import { blockedAuthorIds, viewerFavorited } from '../common/viewer';
import { maskPaths } from '../common/wire';
import { Article as ArticleEntity } from '../entities/article.entity';
import { Comment } from '../entities/comment.entity';
import { Favorite } from '../entities/favorite.entity';
import { User as UserEntity } from '../entities/user.entity';

function parseFilter(filter: string): {
  author?: string;
  favoritedBy?: string;
} {
  if (!filter) return {};
  let m = /^author="([^"]*)"$/.exec(filter);
  if (m) return { author: m[1] };
  m = /^favorited_by="([^"]*)"$/.exec(filter);
  if (m) return { favoritedBy: m[1] };
  throw invalidArgument(`unsupported filter: "${filter}"`);
}

@Controller()
@ArticleServiceControllerMethods()
export class ArticlesController implements ArticleServiceController {
  constructor(private readonly em: EntityManager) {}

  private async toFull(
    article: ArticleEntity,
    callerId?: string,
  ): Promise<Article> {
    const [favoriteCount, favorited] = await Promise.all([
      this.em.count(Favorite, { articleId: article.id }),
      viewerFavorited(this.em, callerId, article.id),
    ]);
    return toArticleProto(article, { favoriteCount, favorited });
  }

  async createArticle(
    @Payload() request: CreateArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<Article> {
    validate(CreateArticleSchema, request);
    const { title, description, body, tags } = request.article!;
    let slug = slugify(title);
    while (await this.em.findOne(ArticleEntity, { slug })) {
      slug = `${slugify(title)}-${randomSuffix()}`;
    }
    const article = this.em.create(ArticleEntity, {
      id: randomUUID(),
      slug,
      title,
      description: description ?? '',
      body,
      tags: tags ?? [],
      authorId: callerId!,
    });
    await this.em.flush();
    return toArticleProto(article, { favoriteCount: 0, favorited: false });
  }

  @Public()
  async getArticle(
    @Payload() request: GetArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<Article> {
    const id = parseArticleName(request.name);
    const article = await this.em.findOne(ArticleEntity, { id });
    if (!article) throw notFound(`article "${request.name}" not found`);
    return this.toFull(article, callerId);
  }

  @Public()
  async lookupArticle(
    @Payload() request: LookupArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<Article> {
    const article = await this.em.findOne(ArticleEntity, {
      slug: request.slug,
    });
    if (!article)
      throw notFound(`article with slug "${request.slug}" not found`);
    return this.toFull(article, callerId);
  }

  @Public()
  async listArticles(
    @Payload() request: ListArticlesRequest,
    @CallerId() callerId?: string,
  ): Promise<ListArticlesResponse> {
    const { author, favoritedBy } = parseFilter(request.filter);
    const pageSize = clampPageSize(request.pageSize);
    const offset = decodePageToken(request.pageToken);

    const conditions: Record<string, unknown>[] = [];
    if (author !== undefined) {
      const authorUser = await this.em.findOne(UserEntity, {
        username: author,
      });
      if (!authorUser) return { articles: [], nextPageToken: '' };
      conditions.push({ authorId: authorUser.id });
    }
    if (favoritedBy !== undefined) {
      const favUser = await this.em.findOne(UserEntity, {
        username: favoritedBy,
      });
      if (!favUser) return { articles: [], nextPageToken: '' };
      const favs = await this.em.find(Favorite, { userId: favUser.id });
      if (favs.length === 0) return { articles: [], nextPageToken: '' };
      conditions.push({ id: { $in: favs.map((f) => f.articleId) } });
    }
    const blocked = await blockedAuthorIds(this.em, callerId);
    if (blocked.length) conditions.push({ authorId: { $nin: blocked } });

    const where = conditions.length ? { $and: conditions } : {};
    const rows = await this.em.find(ArticleEntity, where, {
      orderBy: { createdAt: 'DESC' },
      limit: pageSize + 1,
      offset,
    });
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    const articles = await Promise.all(
      page.map((a) => this.toFull(a, callerId)),
    );
    return {
      articles,
      nextPageToken: hasMore ? encodePageToken(offset + pageSize) : '',
    };
  }

  async updateArticle(
    @Payload() request: UpdateArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<Article> {
    validate(UpdateArticleSchema, request);
    const reqArticle = request.article!;
    const id = parseArticleName(reqArticle.name);
    const article = await this.em.findOne(ArticleEntity, { id });
    if (!article) throw notFound(`article "${reqArticle.name}" not found`);
    if (article.authorId !== callerId)
      throw permissionDenied('only the author can update this article');

    const paths = maskPaths(request.updateMask);
    const populated = (field: 'title' | 'description' | 'body' | 'tags') =>
      paths.length
        ? paths.includes(field)
        : field === 'tags'
          ? reqArticle.tags.length > 0
          : reqArticle[field] !== '';

    let titleChanged = false;
    if (populated('title') && reqArticle.title) {
      article.title = reqArticle.title;
      titleChanged = true;
    }
    if (populated('description')) article.description = reqArticle.description;
    if (populated('body') && reqArticle.body) article.body = reqArticle.body;
    if (populated('tags')) article.tags = reqArticle.tags;

    if (titleChanged) {
      let slug = slugify(article.title);
      while (
        await this.em.findOne(ArticleEntity, { slug, id: { $ne: article.id } })
      ) {
        slug = `${slugify(article.title)}-${randomSuffix()}`;
      }
      article.slug = slug;
    }

    await this.em.flush();
    return this.toFull(article, callerId);
  }

  async deleteArticle(
    @Payload() request: DeleteArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<void> {
    const id = parseArticleName(request.name);
    const article = await this.em.findOne(ArticleEntity, { id });
    if (!article) throw notFound(`article "${request.name}" not found`);
    if (article.authorId !== callerId)
      throw permissionDenied('only the author can delete this article');
    await this.em.nativeDelete(Comment, { articleId: id });
    await this.em.nativeDelete(Favorite, { articleId: id });
    await this.em.nativeDelete(ArticleEntity, { id });
  }

  async favoriteArticle(
    @Payload() request: FavoriteArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<Article> {
    const id = parseArticleName(request.name);
    const article = await this.em.findOne(ArticleEntity, { id });
    if (!article) throw notFound(`article "${request.name}" not found`);
    const existing = await this.em.findOne(Favorite, {
      userId: callerId!,
      articleId: id,
    });
    if (!existing) {
      this.em.create(Favorite, { userId: callerId!, articleId: id });
      await this.em.flush();
    }
    return this.toFull(article, callerId);
  }

  async unfavoriteArticle(
    @Payload() request: UnfavoriteArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<Article> {
    const id = parseArticleName(request.name);
    const article = await this.em.findOne(ArticleEntity, { id });
    if (!article) throw notFound(`article "${request.name}" not found`);
    await this.em.nativeDelete(Favorite, { userId: callerId!, articleId: id });
    return this.toFull(article, callerId);
  }
}
