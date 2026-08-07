import { randomUUID } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { notFound, permissionDenied } from '../common/errors';
import { Article } from '../entities/article.entity';
import { Block } from '../entities/block.entity';
import { Comment } from '../entities/comment.entity';
import { User } from '../entities/user.entity';
import { UsersService } from '../users/users.service';

interface CreateCommentData {
  body: string;
  authorId: string;
  articleId?: string;
  profileOwnerId?: string;
}

export interface ListCommentsResult {
  comments: Comment[];
  hasMore: boolean;
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly em: EntityManager,
    private readonly usersService: UsersService,
  ) {}

  private async create(data: CreateCommentData): Promise<Comment> {
    const comment = this.em.create(Comment, {
      id: randomUUID(),
      body: data.body,
      authorId: data.authorId,
      articleId: data.articleId ?? null,
      profileOwnerId: data.profileOwnerId ?? null,
    });
    await this.em.flush();
    return comment;
  }

  async createOnArticle(
    articleId: string,
    authorId: string,
    body: string,
  ): Promise<Comment> {
    const article = await this.em.findOne(Article, { id: articleId });
    if (!article) throw notFound(`article "articles/${articleId}" not found`);
    const blocked = await this.em.count(Block, {
      blockerId: article.authorId,
      blockedId: authorId,
    });
    if (blocked > 0) throw permissionDenied('blocked by the article author');
    return this.create({ body, authorId, articleId: article.id });
  }

  async createOnUser(
    userId: string,
    authorId: string,
    body: string,
  ): Promise<Comment> {
    const owner = await this.em.findOne(User, { id: userId });
    if (!owner) throw notFound(`user "users/${userId}" not found`);
    const blocked = await this.em.count(Block, {
      blockerId: owner.id,
      blockedId: authorId,
    });
    if (blocked > 0) throw permissionDenied('blocked by the profile owner');
    return this.create({ body, authorId, profileOwnerId: owner.id });
  }

  async ensureArticleExists(articleId: string): Promise<void> {
    if (!(await this.em.findOne(Article, { id: articleId }))) {
      throw notFound(`article "articles/${articleId}" not found`);
    }
  }

  async ensureUserExists(userId: string): Promise<void> {
    if (!(await this.em.findOne(User, { id: userId }))) {
      throw notFound(`user "users/${userId}" not found`);
    }
  }

  async list(
    where: Record<string, unknown>,
    callerId: string | undefined,
    limit: number,
    offset: number,
  ): Promise<ListCommentsResult> {
    const conditions: Record<string, unknown>[] = [where];
    const blocked = await this.usersService.blockedAuthorIds(callerId);
    if (blocked.length) conditions.push({ authorId: { $nin: blocked } });

    const rows = await this.em.find(
      Comment,
      { $and: conditions },
      { orderBy: { createdAt: 'DESC' }, limit: limit + 1, offset },
    );
    return { comments: rows.slice(0, limit), hasMore: rows.length > limit };
  }

  async findById(id: string): Promise<Comment> {
    const comment = await this.em.findOne(Comment, { id });
    if (!comment) throw notFound(`comment "${id}" not found`);
    return comment;
  }

  async update(
    id: string,
    callerId: string | undefined,
    body: string | undefined,
  ): Promise<Comment> {
    const comment = await this.findById(id);
    if (comment.authorId !== callerId) {
      throw permissionDenied('only the author can update this comment');
    }
    if (body) comment.body = body;
    await this.em.flush();
    return comment;
  }

  async delete(id: string, callerId: string | undefined): Promise<void> {
    const comment = await this.findById(id);

    let allowed = comment.authorId === callerId;
    if (!allowed && comment.articleId) {
      const article = await this.em.findOne(Article, { id: comment.articleId });
      allowed = !!article && article.authorId === callerId;
    }
    if (!allowed && comment.profileOwnerId) {
      allowed = comment.profileOwnerId === callerId;
    }
    if (!allowed) throw permissionDenied('not allowed to delete this comment');

    await this.em.nativeDelete(Comment, { id });
  }
}
