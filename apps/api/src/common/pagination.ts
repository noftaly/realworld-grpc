// AIP-158: page_token is an opaque, base64-encoded row offset.

export function decodePageToken(token: string | undefined): number {
  if (!token) return 0;
  try {
    const n = parseInt(Buffer.from(token, 'base64').toString('utf8'), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function encodePageToken(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64');
}

export function clampPageSize(size: number | undefined): number {
  if (!size || size <= 0) return 20;
  return Math.min(size, 100);
}
