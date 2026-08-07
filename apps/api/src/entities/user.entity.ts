import { defineEntity, p } from '@mikro-orm/postgresql';

const UserSchema = defineEntity({
  name: 'User',
  tableName: 'users',
  properties: {
    id: p.uuid().primary(),
    username: p.string().unique(),
    email: p.string().unique(),
    passwordHash: p.string(),
    bio: p.string().default(''),
    image: p.string().default(''),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
