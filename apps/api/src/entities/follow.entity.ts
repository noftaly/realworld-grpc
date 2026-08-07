import { defineEntity, p } from '@mikro-orm/postgresql';

const FollowSchema = defineEntity({
  name: 'Follow',
  tableName: 'follows',
  properties: {
    followerId: p.uuid().primary(),
    followeeId: p.uuid().primary(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export class Follow extends FollowSchema.class {}
FollowSchema.setClass(Follow);
