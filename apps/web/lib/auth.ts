import type { User } from '@repo/proto/client';
import { cookies } from 'next/headers';
import { authMetadata, grpc } from './grpc';

export const TOKEN_COOKIE = 'token';

export async function getToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value;
}

// Resolves the signed-in user, or null when signed out / the token is stale.
export async function getCurrentUser(): Promise<User | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return await grpc.getUser({ name: 'users/me' }, authMetadata(token));
  } catch {
    return null;
  }
}
