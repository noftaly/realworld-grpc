import { Metadata } from '@grpc/grpc-js';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Reads the caller id that AuthGuard stashed on the call's gRPC metadata after verifying the JWT.
// Undefined for anonymous calls to public methods.
export const CallerId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const metadata = ctx.switchToRpc().getContext<Metadata>();
    const values = metadata.get('caller-id');
    return values.length ? String(values[0]) : undefined;
  },
);
