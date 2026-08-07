import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/postgresql';

@Entity({ tableName: 'follows' })
export class Follow {
  @PrimaryKey({ type: 'uuid' })
  followerId!: string;

  @PrimaryKey({ type: 'uuid' })
  followeeId!: string;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Opt<Date> = new Date();
}
