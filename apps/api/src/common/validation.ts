import {
  validate as checkSchema,
  type TSchema,
  ValidationError,
} from '@repo/dto';
import { invalidArgument } from './errors';

// Thin seam between @repo/dto's framework-agnostic TypeBox validation and this app's gRPC error
// convention - the only place a ValidationError gets translated into an RpcException.
export function validate<T extends TSchema>(schema: T, value: unknown): void {
  try {
    checkSchema(schema, value);
  } catch (err) {
    if (err instanceof ValidationError) throw invalidArgument(err.message);
    throw err;
  }
}
