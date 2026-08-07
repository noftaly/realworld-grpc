import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/postgresql';

// Child of either an article (articleId set) or a user profile (profileOwnerId set) - never both.
@Entity({ tableName: 'comments' })
export class Comment {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'text' })
  body!: string;

  @Property({ type: 'uuid' })
  authorId!: string;

  @Property({ type: 'uuid', nullable: true })
  articleId!: string | null;

  @Property({ type: 'uuid', nullable: true })
  profileOwnerId!: string | null;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Opt<Date> = new Date();

  @Property({
    type: 'datetime',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Opt<Date> = new Date();
}
