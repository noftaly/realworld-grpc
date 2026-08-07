import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { CreateArticleSchema, UpdateArticleSchema } from '@repo/dto';
import type {
  Article as ArticleProto,
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
import { invalidArgument } from '../common/errors';
import { validate } from '../common/validation';
import type { Article } from '../entities/article.entity';
import { GrpcService } from '../grpc/grpc.service';
import {
  ARTICLE_NAME,
  type ArticleExtra,
  toArticleProto,
} from './article.mapper';
import type { ArticleFilter, UpdateArticlePatch } from './articles.service';
import { ArticlesService } from './articles.service';

function parseFilter(filter: string): ArticleFilter {
  if (!filter) return {};
  let m = /^author="([^"]*)"$/.exec(filter);
  if (m) return { author: m[1] };
  m = /^favorited_by="([^"]*)"$/.exec(filter);
  if (m) return { favoritedBy: m[1] };
  throw invalidArgument(`unsupported filter: "${filter}"`);
}

@Controller()
@ArticleServiceControllerMethods()
export class ArticlesController
  extends GrpcService<Article, ArticleProto, ArticleExtra>
  implements ArticleServiceController
{
  constructor(private readonly articlesService: ArticlesService) {
    super();
  }

  protected toProto(article: Article, extra: ArticleExtra): ArticleProto {
    return toArticleProto(article, extra);
  }

  private async toFull(
    article: Article,
    callerId?: string,
  ): Promise<ArticleProto> {
    const [favoriteCount, favorited] = await Promise.all([
      this.articlesService.favoriteCount(article.id),
      this.articlesService.isFavorited(callerId, article.id),
    ]);
    return this.toProto(article, { favoriteCount, favorited });
  }

  async createArticle(
    @Payload() request: CreateArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<ArticleProto> {
    validate(CreateArticleSchema, request);
    const { title, description, body, tags } = request.article!;
    const article = await this.articlesService.create({
      title,
      description,
      body,
      tags,
      authorId: callerId!,
    });
    return this.toProto(article, { favoriteCount: 0, favorited: false });
  }

  @Public()
  async getArticle(
    @Payload() request: GetArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<ArticleProto> {
    const article = await this.articlesService.findById(
      this.parseId(ARTICLE_NAME, request.name),
    );
    return this.toFull(article, callerId);
  }

  @Public()
  async lookupArticle(
    @Payload() request: LookupArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<ArticleProto> {
    const article = await this.articlesService.findBySlug(request.slug);
    return this.toFull(article, callerId);
  }

  @Public()
  async listArticles(
    @Payload() request: ListArticlesRequest,
    @CallerId() callerId?: string,
  ): Promise<ListArticlesResponse> {
    const filter = parseFilter(request.filter);
    const pageSize = this.clampPageSize(request.pageSize);
    const offset = this.decodePageToken(request.pageToken);
    const { articles: rows, hasMore } = await this.articlesService.list(
      filter,
      callerId,
      pageSize,
      offset,
    );
    const articles = await Promise.all(
      rows.map((a) => this.toFull(a, callerId)),
    );
    return {
      articles,
      nextPageToken: hasMore ? this.encodePageToken(offset + pageSize) : '',
    };
  }

  async updateArticle(
    @Payload() request: UpdateArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<ArticleProto> {
    validate(UpdateArticleSchema, request);
    const reqArticle = request.article!;
    const id = this.parseId(ARTICLE_NAME, reqArticle.name);

    const paths = this.maskPaths(request.updateMask);
    const patch: UpdateArticlePatch = {};
    if (
      this.isPopulated(paths, 'title', reqArticle.title !== '') &&
      reqArticle.title
    ) {
      patch.title = reqArticle.title;
    }
    if (this.isPopulated(paths, 'description', reqArticle.description !== '')) {
      patch.description = reqArticle.description;
    }
    if (
      this.isPopulated(paths, 'body', reqArticle.body !== '') &&
      reqArticle.body
    ) {
      patch.body = reqArticle.body;
    }
    if (this.isPopulated(paths, 'tags', reqArticle.tags.length > 0)) {
      patch.tags = reqArticle.tags;
    }

    const article = await this.articlesService.update(id, callerId, patch);
    return this.toFull(article, callerId);
  }

  async deleteArticle(
    @Payload() request: DeleteArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<void> {
    await this.articlesService.delete(
      this.parseId(ARTICLE_NAME, request.name),
      callerId,
    );
  }

  async favoriteArticle(
    @Payload() request: FavoriteArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<ArticleProto> {
    const article = await this.articlesService.favorite(
      callerId!,
      this.parseId(ARTICLE_NAME, request.name),
    );
    return this.toFull(article, callerId);
  }

  async unfavoriteArticle(
    @Payload() request: UnfavoriteArticleRequest,
    @CallerId() callerId?: string,
  ): Promise<ArticleProto> {
    const article = await this.articlesService.unfavorite(
      callerId!,
      this.parseId(ARTICLE_NAME, request.name),
    );
    return this.toFull(article, callerId);
  }
}
