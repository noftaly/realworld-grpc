import { defineEntity, p } from '@mikro-orm/postgresql';

// Child of either an article (articleId set) or a user profile (profileOwnerId set) - never both.
const CommentSchema = defineEntity({
  name: 'Comment',
  tableName: 'comments',
  properties: {
    id: p.uuid().primary(),
    body: p.text(),
    authorId: p.uuid(),
    articleId: p.uuid().nullable(),
    profileOwnerId: p.uuid().nullable(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Comment extends CommentSchema.class {}
CommentSchema.setClass(Comment);
