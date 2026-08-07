import type { Comment as CommentEntity } from '../entities/comment.entity';
import { toProtoTimestamp } from '../grpc/grpc.service';
import { ResourceName } from '../grpc/resource-name';
import { USER_NAME } from '../users/user.mapper';

export const ARTICLE_COMMENT_NAME = new ResourceName(
  'articles/{article}/comments/{comment}',
  'comment',
);
export const USER_COMMENT_NAME = new ResourceName(
  'users/{user}/comments/{comment}',
  'comment',
);

export function toCommentProto(c: CommentEntity) {
  const name = c.articleId
    ? ARTICLE_COMMENT_NAME.format(c.articleId, c.id)
    : USER_COMMENT_NAME.format(c.profileOwnerId as string, c.id);
  return {
    name,
    body: c.body,
    author: USER_NAME.format(c.authorId),
    createTime: toProtoTimestamp(c.createdAt),
    updateTime: toProtoTimestamp(c.updatedAt),
  };
}
