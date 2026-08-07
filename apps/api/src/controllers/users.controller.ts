import { randomUUID } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import type {
  BlockUserRequest,
  CreateUserRequest,
  FollowUserRequest,
  GetUserRequest,
  LookupUserRequest,
  UnblockUserRequest,
  UnfollowUserRequest,
  UpdateUserRequest,
  User,
  UserServiceController,
} from '@repo/proto/nestjs';
import { UserServiceControllerMethods } from '@repo/proto/nestjs';
import * as bcrypt from 'bcryptjs';
import { CallerId } from '../auth/caller.decorator';
import { Public } from '../auth/public.decorator';
import {
  alreadyExists,
  invalidArgument,
  notFound,
  permissionDenied,
  unauthenticated,
} from '../common/errors';
import { toUserProto } from '../common/mappers';
import { parseUserName } from '../common/resource-names';
import {
  CreateUserSchema,
  EMAIL_PATTERN,
  UpdateUserSchema,
  USERNAME_PATTERN,
} from '../common/schemas';
import { validate } from '../common/validation';
import { viewerUserFields } from '../common/viewer';
import { maskPaths } from '../common/wire';
import { Block } from '../entities/block.entity';
import { Follow } from '../entities/follow.entity';
import { User as UserEntity } from '../entities/user.entity';

const usernameRe = new RegExp(USERNAME_PATTERN);
const emailRe = new RegExp(EMAIL_PATTERN);

@Controller()
@UserServiceControllerMethods()
export class UsersController implements UserServiceController {
  constructor(private readonly em: EntityManager) {}

  @Public()
  async createUser(@Payload() request: CreateUserRequest): Promise<User> {
    validate(CreateUserSchema, request);
    const { username, email, bio, image } = request.user!;
    if (await this.em.findOne(UserEntity, { username })) {
      throw alreadyExists(`username "${username}" already taken`);
    }
    if (await this.em.findOne(UserEntity, { email })) {
      throw alreadyExists(`email "${email}" already registered`);
    }
    const passwordHash = await bcrypt.hash(request.password, 10);
    const user = this.em.create(UserEntity, {
      id: randomUUID(),
      username,
      email,
      passwordHash,
      bio: bio ?? '',
      image: image ?? '',
    });
    await this.em.flush();
    return toUserProto(user, { following: false, blocked: false });
  }

  @Public()
  async getUser(
    @Payload() request: GetUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    let targetId: string;
    if (request.name === 'users/me') {
      if (!callerId) throw unauthenticated();
      targetId = callerId;
    } else {
      targetId = parseUserName(request.name);
    }
    const user = await this.em.findOne(UserEntity, { id: targetId });
    if (!user) throw notFound(`user "${request.name}" not found`);
    const viewer = await viewerUserFields(this.em, callerId, user.id);
    return toUserProto(user, viewer);
  }

  async updateUser(
    @Payload() request: UpdateUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    validate(UpdateUserSchema, request);
    const reqUser = request.user!;
    const targetId =
      reqUser.name === 'users/me' ? callerId! : parseUserName(reqUser.name);
    if (targetId !== callerId)
      throw permissionDenied('can only update your own profile');

    const user = await this.em.findOne(UserEntity, { id: targetId });
    if (!user) throw notFound(`user "${reqUser.name}" not found`);

    const paths = maskPaths(request.updateMask);
    const populated = (field: 'username' | 'email' | 'bio' | 'image') =>
      paths.length ? paths.includes(field) : reqUser[field] !== '';

    if (populated('username') && reqUser.username) {
      if (!usernameRe.test(reqUser.username))
        throw invalidArgument('invalid username');
      const clash = await this.em.findOne(UserEntity, {
        username: reqUser.username,
      });
      if (clash && clash.id !== user.id)
        throw alreadyExists(`username "${reqUser.username}" already taken`);
      user.username = reqUser.username;
    }
    if (populated('email') && reqUser.email) {
      if (!emailRe.test(reqUser.email)) throw invalidArgument('invalid email');
      const clash = await this.em.findOne(UserEntity, { email: reqUser.email });
      if (clash && clash.id !== user.id)
        throw alreadyExists(`email "${reqUser.email}" already registered`);
      user.email = reqUser.email;
    }
    if (populated('bio')) user.bio = reqUser.bio;
    if (populated('image')) user.image = reqUser.image;
    if (request.password)
      user.passwordHash = await bcrypt.hash(request.password, 10);

    await this.em.flush();
    const viewer = await viewerUserFields(this.em, callerId, user.id);
    return toUserProto(user, viewer);
  }

  @Public()
  async lookupUser(
    @Payload() request: LookupUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    const user = await this.em.findOne(UserEntity, {
      username: request.username,
    });
    if (!user) throw notFound(`user "${request.username}" not found`);
    const viewer = await viewerUserFields(this.em, callerId, user.id);
    return toUserProto(user, viewer);
  }

  async followUser(
    @Payload() request: FollowUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    const targetId = parseUserName(request.name);
    if (targetId === callerId) throw invalidArgument('cannot follow yourself');
    const target = await this.em.findOne(UserEntity, { id: targetId });
    if (!target) throw notFound(`user "${request.name}" not found`);
    const existing = await this.em.findOne(Follow, {
      followerId: callerId!,
      followeeId: targetId,
    });
    if (!existing) {
      this.em.create(Follow, { followerId: callerId!, followeeId: targetId });
      await this.em.flush();
    }
    const viewer = await viewerUserFields(this.em, callerId, targetId);
    return toUserProto(target, viewer);
  }

  async unfollowUser(
    @Payload() request: UnfollowUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    const targetId = parseUserName(request.name);
    const target = await this.em.findOne(UserEntity, { id: targetId });
    if (!target) throw notFound(`user "${request.name}" not found`);
    await this.em.nativeDelete(Follow, {
      followerId: callerId!,
      followeeId: targetId,
    });
    const viewer = await viewerUserFields(this.em, callerId, targetId);
    return toUserProto(target, viewer);
  }

  async blockUser(
    @Payload() request: BlockUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    const targetId = parseUserName(request.name);
    if (targetId === callerId) throw invalidArgument('cannot block yourself');
    const target = await this.em.findOne(UserEntity, { id: targetId });
    if (!target) throw notFound(`user "${request.name}" not found`);
    const existing = await this.em.findOne(Block, {
      blockerId: callerId!,
      blockedId: targetId,
    });
    if (!existing) {
      this.em.create(Block, { blockerId: callerId!, blockedId: targetId });
      await this.em.flush();
    }
    // Blocking removes follow edges in both directions.
    await this.em.nativeDelete(Follow, {
      followerId: callerId!,
      followeeId: targetId,
    });
    await this.em.nativeDelete(Follow, {
      followerId: targetId,
      followeeId: callerId!,
    });
    const viewer = await viewerUserFields(this.em, callerId, targetId);
    return toUserProto(target, viewer);
  }

  async unblockUser(
    @Payload() request: UnblockUserRequest,
    @CallerId() callerId?: string,
  ): Promise<User> {
    const targetId = parseUserName(request.name);
    const target = await this.em.findOne(UserEntity, { id: targetId });
    if (!target) throw notFound(`user "${request.name}" not found`);
    await this.em.nativeDelete(Block, {
      blockerId: callerId!,
      blockedId: targetId,
    });
    const viewer = await viewerUserFields(this.em, callerId, targetId);
    return toUserProto(target, viewer);
  }
}
