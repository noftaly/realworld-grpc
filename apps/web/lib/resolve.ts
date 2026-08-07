import type { User } from '@repo/proto/client';
import { authMetadata, grpc } from './grpc';

// Article/comment `author` fields are just resource names ("users/{id}") - resolve
// them to Users for display. Dedupes and fetches in parallel; N+1 but fine for a POC.
export async function resolveAuthors(
  names: string[],
  token?: string,
): Promise<Map<string, User>> {
  const unique = Array.from(new Set(names));
  const users = await Promise.all(
    unique.map((name) =>
      grpc.getUser({ name }, authMetadata(token)).catch(() => null),
    ),
  );
  const map = new Map<string, User>();
  unique.forEach((name, i) => {
    const user = users[i];
    if (user) map.set(name, user);
  });
  return map;
}
