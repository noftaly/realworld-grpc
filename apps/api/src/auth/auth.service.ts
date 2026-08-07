import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { unauthenticated } from '../common/errors';
import { User } from '../entities/user.entity';
import { signToken } from './jwt';

@Injectable()
export class AuthService {
  constructor(private readonly em: EntityManager) {}

  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> {
    const user = await this.em.findOne(User, { email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw unauthenticated('invalid email or password');
    }
    return { user, token: signToken(user.id) };
  }
}
