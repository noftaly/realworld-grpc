import { randomUUID } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { EMAIL_PATTERN, USERNAME_PATTERN } from '@repo/dto';
import * as bcrypt from 'bcryptjs';
import { alreadyExists, invalidArgument, notFound } from '../common/errors';
import { Block } from '../entities/block.entity';
import { Follow } from '../entities/follow.entity';
import { User } from '../entities/user.entity';
import type { ViewerFields } from './user.mapper';

const usernameRe = new RegExp(USERNAME_PATTERN);
const emailRe = new RegExp(EMAIL_PATTERN);

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  bio?: string;
  image?: string;
}

export interface UpdateUserPatch {
  username?: string;
  email?: string;
  bio?: string;
  image?: string;
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async create(data: CreateUserData): Promise<User> {
    if (await this.em.findOne(User, { username: data.username })) {
      throw alreadyExists(`username "${data.username}" already taken`);
    }
    if (await this.em.findOne(User, { email: data.email })) {
      throw alreadyExists(`email "${data.email}" already registered`);
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.em.create(User, {
      id: randomUUID(),
      username: data.username,
      email: data.email,
      passwordHash,
      bio: data.bio ?? '',
      image: data.image ?? '',
    });
    await this.em.flush();
    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.em.findOne(User, { id });
    if (!user) throw notFound(`user "users/${id}" not found`);
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.em.findOne(User, { username });
    if (!user) throw notFound(`user "${username}" not found`);
    return user;
  }

  async update(targetId: string, patch: UpdateUserPatch): Promise<User> {
    const user = await this.findById(targetId);

    if (patch.username !== undefined) {
      if (!usernameRe.test(patch.username))
        throw invalidArgument('invalid username');
      const clash = await this.em.findOne(User, { username: patch.username });
      if (clash && clash.id !== user.id) {
        throw alreadyExists(`username "${patch.username}" already taken`);
      }
      user.username = patch.username;
    }
    if (patch.email !== undefined) {
      if (!emailRe.test(patch.email)) throw invalidArgument('invalid email');
      const clash = await this.em.findOne(User, { email: patch.email });
      if (clash && clash.id !== user.id) {
        throw alreadyExists(`email "${patch.email}" already registered`);
      }
      user.email = patch.email;
    }
    if (patch.bio !== undefined) user.bio = patch.bio;
    if (patch.image !== undefined) user.image = patch.image;
    if (patch.password)
      user.passwordHash = await bcrypt.hash(patch.password, 10);

    await this.em.flush();
    return user;
  }

  async follow(callerId: string, targetId: string): Promise<User> {
    if (targetId === callerId) throw invalidArgument('cannot follow yourself');
    const target = await this.findById(targetId);
    const existing = await this.em.findOne(Follow, {
      followerId: callerId,
      followeeId: targetId,
    });
    if (!existing) {
      this.em.create(Follow, { followerId: callerId, followeeId: targetId });
      await this.em.flush();
    }
    return target;
  }

  async unfollow(callerId: string, targetId: string): Promise<User> {
    const target = await this.findById(targetId);
    await this.em.nativeDelete(Follow, {
      followerId: callerId,
      followeeId: targetId,
    });
    return target;
  }

  async block(callerId: string, targetId: string): Promise<User> {
    if (targetId === callerId) throw invalidArgument('cannot block yourself');
    const target = await this.findById(targetId);
    const existing = await this.em.findOne(Block, {
      blockerId: callerId,
      blockedId: targetId,
    });
    if (!existing) {
      this.em.create(Block, { blockerId: callerId, blockedId: targetId });
      await this.em.flush();
    }
    // Blocking removes follow edges in both directions.
    await this.em.nativeDelete(Follow, {
      followerId: callerId,
      followeeId: targetId,
    });
    await this.em.nativeDelete(Follow, {
      followerId: targetId,
      followeeId: callerId,
    });
    return target;
  }

  async unblock(callerId: string, targetId: string): Promise<User> {
    const target = await this.findById(targetId);
    await this.em.nativeDelete(Block, {
      blockerId: callerId,
      blockedId: targetId,
    });
    return target;
  }

  async viewerFields(
    callerId: string | undefined,
    targetId: string,
  ): Promise<ViewerFields> {
    if (!callerId || callerId === targetId)
      return { following: false, blocked: false };
    const [following, blocked] = await Promise.all([
      this.em.count(Follow, { followerId: callerId, followeeId: targetId }),
      this.em.count(Block, { blockerId: callerId, blockedId: targetId }),
    ]);
    return { following: following > 0, blocked: blocked > 0 };
  }

  // Ids of users the caller has blocked - used by other feature services to exclude their
  // content from list results.
  async blockedAuthorIds(callerId: string | undefined): Promise<string[]> {
    if (!callerId) return [];
    const rows = await this.em.find(Block, { blockerId: callerId });
    return rows.map((r) => r.blockedId);
  }
}
