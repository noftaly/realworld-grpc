import { Entity, type Opt, PrimaryKey, Property } from '@mikro-orm/postgresql';

@Entity({ tableName: 'users' })
export class User {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string', unique: true })
  username!: string;

  @Property({ type: 'string', unique: true })
  email!: string;

  @Property({ type: 'string' })
  passwordHash!: string;

  @Property({ type: 'string', default: '' })
  bio: Opt<string> = '';

  @Property({ type: 'string', default: '' })
  image: Opt<string> = '';

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt: Opt<Date> = new Date();

  @Property({
    type: 'datetime',
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Opt<Date> = new Date();
}
