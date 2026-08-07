import { defineEntity, p } from '@mikro-orm/postgresql';

const FavoriteSchema = defineEntity({
  name: 'Favorite',
  tableName: 'favorites',
  properties: {
    userId: p.uuid().primary(),
    articleId: p.uuid().primary(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export class Favorite extends FavoriteSchema.class {}
FavoriteSchema.setClass(Favorite);
