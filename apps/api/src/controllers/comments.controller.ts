import { randomUUID } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import type {
  Comment,
  CommentServiceController,
  CreateCommentRequest,
  DeleteCommentRequest,
  ListCommentsRequest,
  ListCommentsResponse,
  UpdateCommentRequest,
} from '@repo/proto/nestjs';
import { CommentServiceControllerMethods } from '@repo/proto/nestjs';
import { CallerId } from '../auth/caller.decorator';
import { Public } from '../auth/public.decorator';
import { notFound, permissionDenied } from '../common/errors';
import { toCommentProto } from '../common/mappers';
import {
  clampPageSize,
  decodePageToken,
  encodePageToken,
} from '../common/pagination';
import { parseCommentName, parseCommentParent } from '../common/resource-names';
import { CreateCommentSchema, UpdateCommentSchema } from '../common/schemas';
import { validate } from '../common/validation';
import { blockedAuthorIds } from '../common/viewer';
import { maskPaths } from '../common/wire';
import { Article as ArticleEntity } from '../entities/article.entity';
import { Block } from '../entities/block.entity';
import { Comment as CommentEntity } from '../entities/comment.entity';
import { User as UserEntity } from '../entities/user.entity';

@Controller()
@CommentServiceControllerMethods()
export class CommentsController implements CommentServiceController {
  constructor(private readonly em: EntityManager) {}

  async createComment(
    @Payload() request: CreateCommentRequest,
    @CallerId() callerId?: string,
  ): Promise<Comment> {
    validate(CreateCommentSchema, request);
    const { kind, id } = parseCommentParent(request.parent);

    let articleId: string | undefined;
    let profileOwnerId: string | undefined;

    if (kind === 'article') {
      const article = await this.em.findOne(ArticleEntity, { id });
      if (!article) throw notFound(`article "${request.parent}" not found`);
      const blocked = await this.em.count(Block, {
        blockerId: article.authorId,
        blockedId: callerId!,
      });
      if (blocked > 0) throw permissionDenied('blocked by the article author');
      articleId = article.id;
    } else {
      const owner = await this.em.findOne(UserEntity, { id });
      if (!owner) throw notFound(`user "${request.parent}" not found`);
      const blocked = await this.em.count(Block, {
        blockerId: owner.id,
        blockedId: callerId!,
      });
      if (blocked > 0) throw permissionDenied('blocked by the profile owner');
      profileOwnerId = owner.id;
    }

    const comment = this.em.create(CommentEntity, {
      id: randomUUID(),
      body: request.comment!.body,
      authorId: callerId!,
      articleId: articleId ?? null,
      profileOwnerId: profileOwnerId ?? null,
    });
    await this.em.flush();
    return toCommentProto(comment);
  }

  @Public()
  async listComments(
    @Payload() request: ListCommentsRequest,
    @CallerId() callerId?: string,
  ): Promise<ListCommentsResponse> {
    const { kind, id } = parseCommentParent(request.parent);
    if (kind === 'article') {
      if (!(await this.em.findOne(ArticleEntity, { id })))
        throw notFound(`article "${request.parent}" not found`);
    } else {
      if (!(await this.em.findOne(UserEntity, { id })))
        throw notFound(`user "${request.parent}" not found`);
    }

    const pageSize = clampPageSize(request.pageSize);
    const offset = decodePageToken(request.pageToken);
    const conditions: Record<string, unknown>[] = [
      kind === 'article' ? { articleId: id } : { profileOwnerId: id },
    ];
    const blocked = await blockedAuthorIds(this.em, callerId);
    if (blocked.length) conditions.push({ authorId: { $nin: blocked } });

    const rows = await this.em.find(
      CommentEntity,
      { $and: conditions },
      { orderBy: { createdAt: 'DESC' }, limit: pageSize + 1, offset },
    );
    const hasMore = rows.length > pageSize;
    const page = hasMore ? rows.slice(0, pageSize) : rows;
    return {
      comments: page.map(toCommentProto),
      nextPageToken: hasMore ? encodePageToken(offset + pageSize) : '',
    };
  }

  async updateComment(
    @Payload() request: UpdateCommentRequest,
    @CallerId() callerId?: string,
  ): Promise<Comment> {
    validate(UpdateCommentSchema, request);
    const reqComment = request.comment!;
    const id = parseCommentName(reqComment.name);
    const comment = await this.em.findOne(CommentEntity, { id });
    if (!comment) throw notFound(`comment "${reqComment.name}" not found`);
    if (comment.authorId !== callerId)
      throw permissionDenied('only the author can update this comment');

    const paths = maskPaths(request.updateMask);
    const populated = paths.length
      ? paths.includes('body')
      : reqComment.body !== '';
    if (populated && reqComment.body) comment.body = reqComment.body;

    await this.em.flush();
    return toCommentProto(comment);
  }

  async deleteComment(
    @Payload() request: DeleteCommentRequest,
    @CallerId() callerId?: string,
  ): Promise<void> {
    const id = parseCommentName(request.name);
    const comment = await this.em.findOne(CommentEntity, { id });
    if (!comment) throw notFound(`comment "${request.name}" not found`);

    let allowed = comment.authorId === callerId;
    if (!allowed && comment.articleId) {
      const article = await this.em.findOne(ArticleEntity, {
        id: comment.articleId,
      });
      allowed = !!article && article.authorId === callerId;
    }
    if (!allowed && comment.profileOwnerId) {
      allowed = comment.profileOwnerId === callerId;
    }
    if (!allowed) throw permissionDenied('not allowed to delete this comment');

    await this.em.nativeDelete(CommentEntity, { id });
  }
}
