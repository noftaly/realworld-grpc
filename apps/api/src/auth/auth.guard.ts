import { Metadata } from '@grpc/grpc-js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { unauthenticated } from '../common/errors';
import { verifyToken } from './jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

// Global guard. Verifies the `authorization: Bearer <token>` gRPC metadata header (if present)
// and stashes the caller id back onto the same Metadata object under 'caller-id', where the
// @CallerId() param decorator picks it up later in the pipeline. Runs for every method whether
// public or not, so viewer-relative fields (following/blocked/favorited) can be computed even on
// public/anonymous-allowed calls when a valid token happens to be attached.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = context.switchToRpc().getContext<Metadata>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const authValues = metadata.get('authorization');
    const header = authValues.length ? String(authValues[0]) : undefined;
    let callerId: string | undefined;
    if (header) {
      const m = /^Bearer\s+(.+)$/i.exec(header);
      if (m) {
        try {
          callerId = verifyToken(m[1]);
        } catch {
          callerId = undefined;
        }
      }
    }

    if (callerId) metadata.set('caller-id', callerId);
    if (!isPublic && !callerId) throw unauthenticated();
    return true;
  }
}
