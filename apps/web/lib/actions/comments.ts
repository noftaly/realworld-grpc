'use server';

import { Comment } from '@repo/proto/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getToken } from '@/lib/auth';
import { authMetadata, friendlyError, grpc } from '@/lib/grpc';

// Plain (non useActionState) form actions - errors are swallowed and the page just
// revalidates, same as the other toggle-style actions (follow/favorite/etc).

export async function createCommentAction(
  parent: string,
  path: string,
  formData: FormData,
): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');

  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;

  try {
    await grpc.createComment(
      { parent, comment: Comment.fromPartial({ body }) },
      authMetadata(token),
    );
  } catch (err) {
    console.error('createComment failed:', friendlyError(err));
    return;
  }
  revalidatePath(path);
}

export async function updateCommentAction(
  name: string,
  path: string,
  formData: FormData,
): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');

  const body = String(formData.get('body') ?? '').trim();
  if (!body) return;

  try {
    await grpc.updateComment(
      { comment: Comment.fromPartial({ name, body }), updateMask: ['body'] },
      authMetadata(token),
    );
  } catch (err) {
    console.error('updateComment failed:', friendlyError(err));
    return;
  }
  revalidatePath(path);
}

export async function deleteCommentAction(
  name: string,
  path: string,
): Promise<void> {
  const token = await getToken();
  if (!token) redirect('/login');
  try {
    await grpc.deleteComment({ name }, authMetadata(token));
  } catch {
    // ignore
  }
  revalidatePath(path);
}
