import { MikroORM, RequestContext } from '@mikro-orm/postgresql';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

// @mikro-orm/nestjs only forks the EntityManager per-request automatically for HTTP (via
// MikroOrmMiddleware). gRPC has no equivalent middleware hook, so this reimplements the same
// RequestContext.create() wrapping as a global interceptor instead.
@Injectable()
export class MikroOrmRpcInterceptor implements NestInterceptor {
  constructor(private readonly orm: MikroORM) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return new Observable((subscriber) => {
      RequestContext.create(this.orm.em, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
