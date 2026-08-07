import type { Article as ArticleEntity } from '../entities/article.entity';
import { toProtoTimestamp } from '../grpc/grpc.service';
import { ResourceName } from '../grpc/resource-name';
import { USER_NAME } from '../users/user.mapper';

export const ARTICLE_NAME = new ResourceName('articles/{article}', 'article');

export interface ArticleExtra {
  favoriteCount: number;
  favorited: boolean;
}

export function toArticleProto(a: ArticleEntity, extra: ArticleExtra) {
  return {
    name: ARTICLE_NAME.format(a.id),
    slug: a.slug,
    title: a.title,
    description: a.description,
    body: a.body,
    tags: a.tags,
    author: USER_NAME.format(a.authorId),
    favoriteCount: extra.favoriteCount,
    favorited: extra.favorited,
    createTime: toProtoTimestamp(a.createdAt),
    updateTime: toProtoTimestamp(a.updatedAt),
  };
}
