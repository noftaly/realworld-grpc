import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { CreateCommentSchema, UpdateCommentSchema } from '@repo/dto';
import type {
  Comment as CommentProto,
  CommentServiceController,
  CreateCommentRequest,
  DeleteCommentRequest,
  ListCommentsRequest,
  ListCommentsResponse,
  UpdateCommentRequest,
} from '@repo/proto/nestjs';
import { CommentServiceControllerMethods } from '@repo/proto/nestjs';
import { ARTICLE_NAME } from '../articles/article.mapper';
import { CallerId } from '../auth/caller.decorator';
import { Public } from '../auth/public.decorator';
import { validate } from '../common/validation';
import type { Comment } from '../entities/comment.entity';
import { GrpcService } from '../grpc/grpc.service';
import { ResourceName } from '../grpc/resource-name';
import { USER_NAME } from '../users/user.mapper';
import { toCommentProto } from './comment.mapper';
import { CommentsService } from './comments.service';

// A CreateCommentRequest.parent / ListCommentsRequest.parent is either an article or a user
// profile - one more resource kind here (and a matching branch below) is the whole growth story.
const COMMENT_PARENT_PATTERNS = {
  article: ARTICLE_NAME,
  user: USER_NAME,
} as const;

@Controller()
@CommentServiceControllerMethods()
export class CommentsController
  extends GrpcService<Comment, CommentProto>
  implements CommentServiceController
{
  constructor(private readonly commentsService: CommentsService) {
    super();
  }

  protected toProto(comment: Comment): CommentProto {
    return toCommentProto(comment);
  }

  async createComment(
    @Payload() request: CreateCommentRequest,
    @CallerId() callerId?: string,
  ): Promise<CommentProto> {
    validate(CreateCommentSchema, request);
    const { kind, ids } = ResourceName.matchOneOf(
      request.parent,
      COMMENT_PARENT_PATTERNS,
      'comment parent',
    );
    const comment =
      kind === 'article'
        ? await this.commentsService.createOnArticle(
            ids[0],
            callerId!,
            request.comment!.body,
          )
        : await this.commentsService.createOnUser(
            ids[0],
            callerId!,
            request.comment!.body,
          );
    return this.toProto(comment);
  }

  @Public()
  async listComments(
    @Payload() request: ListCommentsRequest,
    @CallerId() callerId?: string,
  ): Promise<ListCommentsResponse> {
    const { kind, ids } = ResourceName.matchOneOf(
      request.parent,
      COMMENT_PARENT_PATTERNS,
      'comment parent',
    );
    const parentId = ids[0];
    if (kind === 'article')
      await this.commentsService.ensureArticleExists(parentId);
    else await this.commentsService.ensureUserExists(parentId);

    const pageSize = this.clampPageSize(request.pageSize);
    const offset = this.decodePageToken(request.pageToken);
    const where =
      kind === 'article'
        ? { articleId: parentId }
        : { profileOwnerId: parentId };
    const { comments: rows, hasMore } = await this.commentsService.list(
      where,
      callerId,
      pageSize,
      offset,
    );
    return {
      comments: rows.map(toCommentProto),
      nextPageToken: hasMore ? this.encodePageToken(offset + pageSize) : '',
    };
  }

  async updateComment(
    @Payload() request: UpdateCommentRequest,
    @CallerId() callerId?: string,
  ): Promise<CommentProto> {
    validate(UpdateCommentSchema, request);
    const reqComment = request.comment!;
    const id = ResourceName.lastSegment(reqComment.name, 'comments', 'comment');

    const paths = this.maskPaths(request.updateMask);
    const bodyPopulated = this.isPopulated(
      paths,
      'body',
      reqComment.body !== '',
    );

    const comment = await this.commentsService.update(
      id,
      callerId,
      bodyPopulated ? reqComment.body : undefined,
    );
    return this.toProto(comment);
  }

  async deleteComment(
    @Payload() request: DeleteCommentRequest,
    @CallerId() callerId?: string,
  ): Promise<void> {
    const id = ResourceName.lastSegment(request.name, 'comments', 'comment');
    await this.commentsService.delete(id, callerId);
  }
}
