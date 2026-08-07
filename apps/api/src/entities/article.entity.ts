import { defineEntity, p } from '@mikro-orm/postgresql';

const ArticleSchema = defineEntity({
  name: 'Article',
  tableName: 'articles',
  properties: {
    id: p.uuid().primary(),
    slug: p.string().unique(),
    title: p.string(),
    description: p.string().default(''),
    body: p.text(),
    tags: p.string().array(),
    // Plain id column, no MikroORM relation - keeps querying simple for this PoC.
    authorId: p.uuid(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class Article extends ArticleSchema.class {}
ArticleSchema.setClass(Article);
