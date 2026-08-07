import { Controller } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { CreateUserSchema, UpdateUserSchema } from '@repo/dto';
import type {
  BlockUserRequest,
  CreateUserRequest,
  FollowUserRequest,
  GetUserRequest,
  LookupUserRequest,
  UnblockUserRequest,
  UnfollowUserRequest,
  UpdateUserRequest,
  User as UserProto,
  UserServiceController,
} from '@repo/proto/nestjs';
import { UserServiceControllerMethods } from '@repo/proto/nestjs';
import { CallerId } from '../auth/caller.decorator';
import { Public } from '../auth/public.decorator';
import { permissionDenied, unauthenticated } from '../common/errors';
import { validate } from '../common/validation';
import type { User } from '../entities/user.entity';
import { GrpcService } from '../grpc/grpc.service';
import { toUserProto, USER_NAME, type ViewerFields } from './user.mapper';
import type { UpdateUserPatch } from './users.service';
import { UsersService } from './users.service';

@Controller()
@UserServiceControllerMethods()
export class UsersController
  extends GrpcService<User, UserProto, ViewerFields>
  implements UserServiceController
{
  constructor(private readonly usersService: UsersService) {
    super();
  }

  protected toProto(user: User, viewer: ViewerFields): UserProto {
    return toUserProto(user, viewer);
  }

  @Public()
  async createUser(@Payload() request: CreateUserRequest): Promise<UserProto> {
    validate(CreateUserSchema, request);
    const { username, email, bio, image } = request.user!;
    const user = await this.usersService.create({
      username,
      email,
      password: request.password,
      bio,
      image,
    });
    return this.toProto(user, { following: false, blocked: false });
  }

  @Public()
  async getUser(
    @Payload() request: GetUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    let targetId: string;
    if (request.name === 'users/me') {
      if (!callerId) throw unauthenticated();
      targetId = callerId;
    } else {
      targetId = this.parseId(USER_NAME, request.name);
    }
    const user = await this.usersService.findById(targetId);
    const viewer = await this.usersService.viewerFields(callerId, user.id);
    return this.toProto(user, viewer);
  }

  async updateUser(
    @Payload() request: UpdateUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    validate(UpdateUserSchema, request);
    const reqUser = request.user!;
    const targetId =
      reqUser.name === 'users/me'
        ? callerId!
        : this.parseId(USER_NAME, reqUser.name);
    if (targetId !== callerId)
      throw permissionDenied('can only update your own profile');

    const paths = this.maskPaths(request.updateMask);
    const patch: UpdateUserPatch = {};
    if (
      this.isPopulated(paths, 'username', reqUser.username !== '') &&
      reqUser.username
    ) {
      patch.username = reqUser.username;
    }
    if (
      this.isPopulated(paths, 'email', reqUser.email !== '') &&
      reqUser.email
    ) {
      patch.email = reqUser.email;
    }
    if (this.isPopulated(paths, 'bio', reqUser.bio !== ''))
      patch.bio = reqUser.bio;
    if (this.isPopulated(paths, 'image', reqUser.image !== ''))
      patch.image = reqUser.image;
    if (request.password) patch.password = request.password;

    const user = await this.usersService.update(targetId, patch);
    const viewer = await this.usersService.viewerFields(callerId, user.id);
    return this.toProto(user, viewer);
  }

  @Public()
  async lookupUser(
    @Payload() request: LookupUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    const user = await this.usersService.findByUsername(request.username);
    const viewer = await this.usersService.viewerFields(callerId, user.id);
    return this.toProto(user, viewer);
  }

  async followUser(
    @Payload() request: FollowUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    const target = await this.usersService.follow(
      callerId!,
      this.parseId(USER_NAME, request.name),
    );
    const viewer = await this.usersService.viewerFields(callerId, target.id);
    return this.toProto(target, viewer);
  }

  async unfollowUser(
    @Payload() request: UnfollowUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    const target = await this.usersService.unfollow(
      callerId!,
      this.parseId(USER_NAME, request.name),
    );
    const viewer = await this.usersService.viewerFields(callerId, target.id);
    return this.toProto(target, viewer);
  }

  async blockUser(
    @Payload() request: BlockUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    const target = await this.usersService.block(
      callerId!,
      this.parseId(USER_NAME, request.name),
    );
    const viewer = await this.usersService.viewerFields(callerId, target.id);
    return this.toProto(target, viewer);
  }

  async unblockUser(
    @Payload() request: UnblockUserRequest,
    @CallerId() callerId?: string,
  ): Promise<UserProto> {
    const target = await this.usersService.unblock(
      callerId!,
      this.parseId(USER_NAME, request.name),
    );
    const viewer = await this.usersService.viewerFields(callerId, target.id);
    return this.toProto(target, viewer);
  }
}
