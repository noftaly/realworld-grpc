import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/postgresql';

@Entity({ tableName: 'favorites' })
export class Favorite {
  @PrimaryKey({ type: 'uuid' })
  userId!: string;

  @PrimaryKey({ type: 'uuid' })
  articleId!: string;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Opt<Date> = new Date();
}
