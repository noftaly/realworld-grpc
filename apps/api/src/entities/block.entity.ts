import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/postgresql';

@Entity({ tableName: 'blocks' })
export class Block {
  @PrimaryKey({ type: 'uuid' })
  blockerId!: string;

  @PrimaryKey({ type: 'uuid' })
  blockedId!: string;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Opt<Date> = new Date();
}
