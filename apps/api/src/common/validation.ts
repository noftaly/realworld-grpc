import { TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { invalidArgument } from './errors';

export function validate<T extends TSchema>(schema: T, value: unknown): void {
  if (Value.Check(schema, value)) return;
  const errors = [...Value.Errors(schema, value)].slice(0, 5);
  const msg = errors
    .map((e) => `${e.path || '(root)'}: ${e.message}`)
    .join('; ');
  throw invalidArgument(msg || 'validation failed');
}
