import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/postgresql';

@Entity({ tableName: 'articles' })
export class Article {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string', unique: true })
  slug!: string;

  @Property({ type: 'string' })
  title!: string;

  @Property({ type: 'string', default: '' })
  description: Opt<string> = '';

  @Property({ type: 'text' })
  body!: string;

  @Property({ type: 'array' })
  tags: Opt<string[]> = [];

  // Plain id column, no MikroORM relation - keeps querying simple for this PoC.
  @Property({ type: 'uuid' })
  authorId!: string;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Opt<Date> = new Date();

  @Property({
    type: 'datetime',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Opt<Date> = new Date();
}
