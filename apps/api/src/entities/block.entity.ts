import { defineEntity, p } from '@mikro-orm/postgresql';

const BlockSchema = defineEntity({
  name: 'Block',
  tableName: 'blocks',
  properties: {
    blockerId: p.uuid().primary(),
    blockedId: p.uuid().primary(),
    createdAt: p.datetime().onCreate(() => new Date()),
  },
});

export class Block extends BlockSchema.class {}
BlockSchema.setClass(Block);
