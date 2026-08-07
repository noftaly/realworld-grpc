import type { User as UserEntity } from '../entities/user.entity';
import { toProtoTimestamp } from '../grpc/grpc.service';
import { ResourceName } from '../grpc/resource-name';

export const USER_NAME = new ResourceName('users/{user}', 'user');

export interface ViewerFields {
  following: boolean;
  blocked: boolean;
}

export function toUserProto(u: UserEntity, viewer: ViewerFields) {
  return {
    name: USER_NAME.format(u.id),
    username: u.username,
    email: u.email,
    bio: u.bio,
    image: u.image,
    following: viewer.following,
    blocked: viewer.blocked,
    createTime: toProtoTimestamp(u.createdAt),
    updateTime: toProtoTimestamp(u.updatedAt),
  };
}
