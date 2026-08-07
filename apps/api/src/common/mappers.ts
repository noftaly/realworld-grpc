import { Article } from '../entities/article.entity';
import { Comment } from '../entities/comment.entity';
import { User } from '../entities/user.entity';
import {
  articleCommentName,
  articleName,
  userCommentName,
  userName,
} from './resource-names';
import { toProtoTimestamp } from './wire';

export function toUserProto(
  u: User,
  viewer: { following: boolean; blocked: boolean },
) {
  return {
    name: userName(u.id),
    username: u.username,
    email: u.email,
    bio: u.bio,
    image: u.image,
    following: viewer.following,
    blocked: viewer.blocked,
    createTime: toProtoTimestamp(u.createdAt),
    updateTime: toProtoTimestamp(u.updatedAt),
  };
}

export function toArticleProto(
  a: Article,
  extra: { favoriteCount: number; favorited: boolean },
) {
  return {
    name: articleName(a.id),
    slug: a.slug,
    title: a.title,
    description: a.description,
    body: a.body,
    tags: a.tags,
    author: userName(a.authorId),
    favoriteCount: extra.favoriteCount,
    favorited: extra.favorited,
    createTime: toProtoTimestamp(a.createdAt),
    updateTime: toProtoTimestamp(a.updatedAt),
  };
}

export function toCommentProto(c: Comment) {
  const name = c.articleId
    ? articleCommentName(c.articleId, c.id)
    : userCommentName(c.profileOwnerId as string, c.id);
  return {
    name,
    body: c.body,
    author: userName(c.authorId),
    createTime: toProtoTimestamp(c.createdAt),
    updateTime: toProtoTimestamp(c.updatedAt),
  };
}
