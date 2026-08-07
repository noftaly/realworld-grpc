'use client';

import type { Article } from '@repo/proto/client';
import { useActionState } from 'react';

type FormState = { error?: string } | undefined;
type Action = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function EditorForm({
  action,
  initial,
}: {
  action: Action;
  initial?: Article;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="form">
      {state?.error && <p className="error">{state.error}</p>}
      <label>
        Title
        <input name="title" defaultValue={initial?.title} required />
      </label>
      <label>
        Description
        <input name="description" defaultValue={initial?.description} />
      </label>
      <label>
        Body
        <textarea name="body" defaultValue={initial?.body} rows={14} required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Publishing…' : 'Publish'}
      </button>
    </form>
  );
}
