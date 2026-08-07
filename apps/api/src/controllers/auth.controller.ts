import { EntityManager } from '@mikro-orm/postgresql';
import { Controller } from '@nestjs/common';
import type {
  AuthServiceController,
  SignInRequest,
  SignInResponse,
} from '@repo/proto/nestjs';
import { AuthServiceControllerMethods } from '@repo/proto/nestjs';
import * as bcrypt from 'bcryptjs';
import { signToken } from '../auth/jwt';
import { Public } from '../auth/public.decorator';
import { unauthenticated } from '../common/errors';
import { toUserProto } from '../common/mappers';
import { SignInSchema } from '../common/schemas';
import { validate } from '../common/validation';
import { User } from '../entities/user.entity';

@Controller()
@AuthServiceControllerMethods()
export class AuthController implements AuthServiceController {
  constructor(private readonly em: EntityManager) {}

  @Public()
  async signIn(request: SignInRequest): Promise<SignInResponse> {
    validate(SignInSchema, request);
    const user = await this.em.findOne(User, { email: request.email });
    if (!user || !(await bcrypt.compare(request.password, user.passwordHash))) {
      throw unauthenticated('invalid email or password');
    }
    const token = signToken(user.id);
    return {
      token,
      user: toUserProto(user, { following: false, blocked: false }),
    };
  }
}
