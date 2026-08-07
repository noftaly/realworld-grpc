import { status } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';

// @grpc/grpc-js reads err.code (status) and err.details (message) off the error object
// handed to the unary callback - RpcException.getError() forwards this object verbatim.
function grpcError(code: number, message: string): RpcException {
  return new RpcException({ code, message, details: message });
}

export const notFound = (msg: string) => grpcError(status.NOT_FOUND, msg);
export const alreadyExists = (msg: string) =>
  grpcError(status.ALREADY_EXISTS, msg);
export const invalidArgument = (msg: string) =>
  grpcError(status.INVALID_ARGUMENT, msg);
export const permissionDenied = (msg: string) =>
  grpcError(status.PERMISSION_DENIED, msg);
export const unauthenticated = (msg = 'authentication required') =>
  grpcError(status.UNAUTHENTICATED, msg);
