// Wire-format helpers for the @grpc/proto-loader dynamic-loading server.
//
// The `@repo/proto/nestjs` TS types come from ts-proto (useDate=false), which types
// `updateMask` as `string[] | undefined` and timestamps as `{seconds,nanos} | undefined`.
// Those types describe ts-proto's OWN codec output, not what @grpc/proto-loader actually
// produces at runtime. Verified by round-tripping messages through the loader directly:
// FieldMask decodes to `{ paths: string[] }` (its literal wire shape, proto-loader applies no
// FieldMask unwrapping), not a bare array. Always go through `maskPaths()` below rather than
// trusting the `string[]` type. Timestamps do decode as plain `{seconds, nanos}` as expected.

export function maskPaths(mask: unknown): string[] {
  if (!mask) return [];
  if (Array.isArray(mask)) return mask as string[];
  const paths = (mask as { paths?: unknown }).paths;
  return Array.isArray(paths) ? (paths as string[]) : [];
}

export function toProtoTimestamp(d: Date): { seconds: number; nanos: number } {
  const ms = d.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    nanos: (((ms % 1000) + 1000) % 1000) * 1e6,
  };
}
