import type { ResourceName } from './resource-name';

// {seconds,nanos} is what ts-proto types timestamps as (useDate=false) and also, conveniently,
// what @grpc/proto-loader actually produces at runtime - unlike FieldMask below, no surprises here.
export function toProtoTimestamp(d: Date): { seconds: number; nanos: number } {
  const ms = d.getTime();
  return {
    seconds: Math.floor(ms / 1000),
    nanos: (((ms % 1000) + 1000) % 1000) * 1e6,
  };
}

// Base for gRPC feature controllers - the "does much of the decoding" layer. Centralizes what
// used to be spread across src/common/{wire,pagination,resource-names}.ts: resource-name parsing
// bound to a resource's pattern (see ResourceName), FieldMask normalization (@grpc/proto-loader
// decodes a FieldMask to its literal wire shape `{ paths: string[] }`, not the bare `string[]`
// ts-proto's own types claim - never trust that type, always go through maskPaths), AIP-158 page
// tokens, and timestamp conversion. Entity -> proto mapping is the one hook every resource
// implements itself (see toProto). Growth story: a new resource gets a ResourceName pattern (in
// its own mapper module) and a toProto() override here - nothing else to sprinkle around.
export abstract class GrpcService<TEntity, TProto, TExtra = void> {
  protected abstract toProto(entity: TEntity, extra: TExtra): TProto;

  protected parseId(pattern: ResourceName, name: string): string {
    return pattern.parseOne(name);
  }

  protected maskPaths(mask: unknown): string[] {
    if (!mask) return [];
    if (Array.isArray(mask)) return mask as string[];
    const paths = (mask as { paths?: unknown }).paths;
    return Array.isArray(paths) ? (paths as string[]) : [];
  }

  // A field is populated when it's explicitly named in the mask, or - with no mask sent at all -
  // when the caller's request actually carries a non-default value for it (proto3 has no "unset",
  // so absence and the zero value are indistinguishable without a mask).
  protected isPopulated(
    paths: string[],
    field: string,
    hasValue: boolean,
  ): boolean {
    return paths.length ? paths.includes(field) : hasValue;
  }

  protected toTimestamp(d: Date): { seconds: number; nanos: number } {
    return toProtoTimestamp(d);
  }

  protected clampPageSize(size: number | undefined): number {
    if (!size || size <= 0) return 20;
    return Math.min(size, 100);
  }

  protected decodePageToken(token: string | undefined): number {
    if (!token) return 0;
    try {
      const n = parseInt(Buffer.from(token, 'base64').toString('utf8'), 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  protected encodePageToken(offset: number): string {
    return Buffer.from(String(offset), 'utf8').toString('base64');
  }
}
