'use server';

import { Article } from '@repo/proto/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { authMetadata, friendlyError, grpc } from '@/lib/grpc';

export type FormState = { error?: string } | undefined;

export async function createArticleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = await getToken();
  if (!token) redirect('/login');

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  if (!title || !body) return { error: 'Title and body are required.' };

  let slug: string;
  try {
    const article = await grpc.createArticle(
      { article: Article.fromPartial({ title, description, body }) },
      authMetadata(token),
    );
    slug = article.slug;
  } catch (err) {
    return { error: friendlyError(err) };
  }
  revalidatePath('/');
  redirect(`/article/${slug}`);
}

// name/originalTitle/originalDescription/originalBody are bound with .bind() from the
// editor form; only fields that actually changed are sent, via the update mask.
export async function updateArticleAction(
  name: string,
  slug: string,
  original: { title: string; description: string; body: string },
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = await getToken();
  if (!token) redirect('/login');

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  if (!title || !body) return { error: 'Title and body are required.' };

  const updateMask: string[] = [];
  if (title !== original.title) updateMask.push('title');
  if (description !== original.description) updateMask.push('description');
  if (body !== original.body) updateMask.push('body');

  let newSlug = slug;
  if (updateMask.length > 0) {
    try {
      const article = await grpc.updateArticle(
        {
          article: Article.fromPartial({ name, title, description, body }),
          updateMask,
        },
        authMetadata(token),
      );
      newSlug = article.slug;
    } catch (err) {
      return { error: friendlyError(err) };
    }
  }
  revalidatePath('/');
  revalidatePath(`/article/${slug}`);
  redirect(`/article/${newSlug}`);
}

export async function deleteArticleAction(name: string): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    await grpc.deleteArticle({ name }, authMetadata(token));
  } catch {
    // best-effort; fall through and go home regardless
  }
  revalidatePath('/');
  redirect('/');
}

export async function toggleFavoriteAction(
  name: string,
  favorited: boolean,
  path: string,
): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    if (favorited) {
      await grpc.unfavoriteArticle({ name }, authMetadata(token));
    } else {
      await grpc.favoriteArticle({ name }, authMetadata(token));
    }
  } catch {
    // ignore - stale state will just show the previous favorite state
  }
  revalidatePath(path);
}
