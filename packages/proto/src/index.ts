import * as path from 'node:path';

// Absolute path to the .proto sources, for loading at runtime with
// @grpc/proto-loader (e.g. in the NestJS gRPC microservice transport).
export const PROTO_DIR = path.join(__dirname, '..', '..', 'proto');

// google/api/{field_behavior,resource}.proto, vendored from the buf.build/googleapis/googleapis
// dependency. Our .proto files import these, but @grpc/proto-loader resolves imports from disk at
// runtime (unlike buf, it doesn't fetch from the BSR), so a copy must live outside the `proto`
// buf module (otherwise `buf generate` sees them as claimed by two modules). Pass this alongside
// PROTO_DIR in the server's `includeDirs`.
export const PROTO_VENDOR_DIR = path.join(
  __dirname,
  '..',
  '..',
  'proto-vendor',
);
