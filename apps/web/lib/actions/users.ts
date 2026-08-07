'use server';

import { User } from '@repo/proto/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { authMetadata, friendlyError, grpc } from '@/lib/grpc';

export type FormState = { error?: string } | undefined;

export async function updateSettingsAction(
  name: string,
  original: { username: string; email: string; bio: string; image: string },
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = await getToken();
  if (!token) redirect('/login');

  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const bio = String(formData.get('bio') ?? '');
  const image = String(formData.get('image') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!username || !email) return { error: 'Username and email are required.' };

  const updateMask: string[] = [];
  if (username !== original.username) updateMask.push('username');
  if (email !== original.email) updateMask.push('email');
  if (bio !== original.bio) updateMask.push('bio');
  if (image !== original.image) updateMask.push('image');

  if (updateMask.length === 0 && !password) return undefined;

  try {
    await grpc.updateUser(
      {
        user: User.fromPartial({ name, username, email, bio, image }),
        updateMask,
        password,
      },
      authMetadata(token),
    );
  } catch (err) {
    return { error: friendlyError(err) };
  }
  revalidatePath('/settings');
  revalidatePath(`/profile/${username}`);
  return undefined;
}

export async function followAction(name: string, path: string): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    await grpc.followUser({ name }, authMetadata(token));
  } catch {
    // ignore
  }
  revalidatePath(path);
}

export async function unfollowAction(
  name: string,
  path: string,
): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    await grpc.unfollowUser({ name }, authMetadata(token));
  } catch {
    // ignore
  }
  revalidatePath(path);
}

export async function blockAction(name: string, path: string): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    await grpc.blockUser({ name }, authMetadata(token));
  } catch {
    // ignore
  }
  revalidatePath(path);
}

export async function unblockAction(name: string, path: string): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    await grpc.unblockUser({ name }, authMetadata(token));
  } catch {
    // ignore
  }
  revalidatePath(path);
}
