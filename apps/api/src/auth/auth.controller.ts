import { Controller } from '@nestjs/common';
import { SignInSchema } from '@repo/dto';
import type {
  AuthServiceController,
  SignInRequest,
  SignInResponse,
} from '@repo/proto/nestjs';
import { AuthServiceControllerMethods } from '@repo/proto/nestjs';
import { validate } from '../common/validation';
import { toUserProto } from '../users/user.mapper';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller()
@AuthServiceControllerMethods()
export class AuthController implements AuthServiceController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  async signIn(request: SignInRequest): Promise<SignInResponse> {
    validate(SignInSchema, request);
    const { user, token } = await this.authService.signIn(
      request.email,
      request.password,
    );
    return {
      token,
      user: toUserProto(user, { following: false, blocked: false }),
    };
  }
}
