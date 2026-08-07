'use server';

import { User } from '@repo/proto/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TOKEN_COOKIE } from '@/lib/auth';
import { friendlyError, grpc } from '@/lib/grpc';

export type FormState = { error?: string } | undefined;

async function setSession(token: string) {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Email and password are required.' };

  let token: string;
  try {
    const res = await grpc.signIn({ email, password });
    token = res.token;
  } catch (err) {
    return { error: friendlyError(err) };
  }
  await setSession(token);
  redirect('/');
}

export async function registerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const username = String(formData.get('username') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!username || !email || !password) {
    return { error: 'Username, email and password are required.' };
  }

  try {
    await grpc.createUser({
      user: User.fromPartial({ username, email }),
      password,
    });
  } catch (err) {
    return { error: friendlyError(err) };
  }

  // signup doesn't return a token - sign in right after
  let token: string;
  try {
    const res = await grpc.signIn({ email, password });
    token = res.token;
  } catch (err) {
    return { error: friendlyError(err) };
  }
  await setSession(token);
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  redirect('/');
}
