import { randomUUID } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { notFound, permissionDenied } from '../common/errors';
import { Article } from '../entities/article.entity';
import { Comment } from '../entities/comment.entity';
import { Favorite } from '../entities/favorite.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'article';
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export interface ArticleFilter {
  author?: string;
  favoritedBy?: string;
}

export interface CreateArticleData {
  title: string;
  description?: string;
  body: string;
  tags?: string[];
  authorId: string;
}

export interface UpdateArticlePatch {
  title?: string;
  description?: string;
  body?: string;
  tags?: string[];
}

export interface ListArticlesResult {
  articles: Article[];
  hasMore: boolean;
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly em: EntityManager,
    private readonly usersService: UsersService,
  ) {}

  private async uniqueSlug(title: string, excludeId?: string): Promise<string> {
    let slug = slugify(title);
    while (
      await this.em.findOne(
        Article,
        excludeId ? { slug, id: { $ne: excludeId } } : { slug },
      )
    ) {
      slug = `${slugify(title)}-${randomSuffix()}`;
    }
    return slug;
  }

  async create(data: CreateArticleData): Promise<Article> {
    const slug = await this.uniqueSlug(data.title);
    const article = this.em.create(Article, {
      id: randomUUID(),
      slug,
      title: data.title,
      description: data.description ?? '',
      body: data.body,
      tags: data.tags ?? [],
      authorId: data.authorId,
    });
    await this.em.flush();
    return article;
  }

  async findById(id: string): Promise<Article> {
    const article = await this.em.findOne(Article, { id });
    if (!article) throw notFound(`article "articles/${id}" not found`);
    return article;
  }

  async findBySlug(slug: string): Promise<Article> {
    const article = await this.em.findOne(Article, { slug });
    if (!article) throw notFound(`article with slug "${slug}" not found`);
    return article;
  }

  async favoriteCount(articleId: string): Promise<number> {
    return this.em.count(Favorite, { articleId });
  }

  async isFavorited(
    callerId: string | undefined,
    articleId: string,
  ): Promise<boolean> {
    if (!callerId) return false;
    return (await this.em.count(Favorite, { userId: callerId, articleId })) > 0;
  }

  async list(
    filter: ArticleFilter,
    callerId: string | undefined,
    limit: number,
    offset: number,
  ): Promise<ListArticlesResult> {
    const conditions: Record<string, unknown>[] = [];
    if (filter.author !== undefined) {
      const authorUser = await this.em.findOne(User, {
        username: filter.author,
      });
      if (!authorUser) return { articles: [], hasMore: false };
      conditions.push({ authorId: authorUser.id });
    }
    if (filter.favoritedBy !== undefined) {
      const favUser = await this.em.findOne(User, {
        username: filter.favoritedBy,
      });
      if (!favUser) return { articles: [], hasMore: false };
      const favs = await this.em.find(Favorite, { userId: favUser.id });
      if (favs.length === 0) return { articles: [], hasMore: false };
      conditions.push({ id: { $in: favs.map((f) => f.articleId) } });
    }
    const blocked = await this.usersService.blockedAuthorIds(callerId);
    if (blocked.length) conditions.push({ authorId: { $nin: blocked } });

    const where = conditions.length ? { $and: conditions } : {};
    const rows = await this.em.find(Article, where, {
      orderBy: { createdAt: 'DESC' },
      limit: limit + 1,
      offset,
    });
    return { articles: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  async update(
    id: string,
    callerId: string | undefined,
    patch: UpdateArticlePatch,
  ): Promise<Article> {
    const article = await this.findById(id);
    if (article.authorId !== callerId) {
      throw permissionDenied('only the author can update this article');
    }

    let titleChanged = false;
    if (patch.title) {
      article.title = patch.title;
      titleChanged = true;
    }
    if (patch.description !== undefined)
      article.description = patch.description;
    if (patch.body) article.body = patch.body;
    if (patch.tags !== undefined) article.tags = patch.tags;

    if (titleChanged) {
      article.slug = await this.uniqueSlug(article.title, article.id);
    }

    await this.em.flush();
    return article;
  }

  async delete(id: string, callerId: string | undefined): Promise<void> {
    const article = await this.findById(id);
    if (article.authorId !== callerId) {
      throw permissionDenied('only the author can delete this article');
    }
    await this.em.nativeDelete(Comment, { articleId: id });
    await this.em.nativeDelete(Favorite, { articleId: id });
    await this.em.nativeDelete(Article, { id });
  }

  async favorite(callerId: string, articleId: string): Promise<Article> {
    const article = await this.findById(articleId);
    const existing = await this.em.findOne(Favorite, {
      userId: callerId,
      articleId,
    });
    if (!existing) {
      this.em.create(Favorite, { userId: callerId, articleId });
      await this.em.flush();
    }
    return article;
  }

  async unfavorite(callerId: string, articleId: string): Promise<Article> {
    const article = await this.findById(articleId);
    await this.em.nativeDelete(Favorite, { userId: callerId, articleId });
    return article;
  }
}
