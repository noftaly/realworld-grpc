'use client';

import type { User } from '@repo/proto/client';
import { useActionState } from 'react';
import { updateSettingsAction } from '@/lib/actions/users';

export function SettingsForm({ user }: { user: User }) {
  const action = updateSettingsAction.bind(null, user.name, {
    username: user.username,
    email: user.email,
    bio: user.bio,
    image: user.image,
  });
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="form">
      {state?.error && <p className="error">{state.error}</p>}
      <label>
        Username
        <input name="username" defaultValue={user.username} required />
      </label>
      <label>
        Email
        <input name="email" type="email" defaultValue={user.email} required />
      </label>
      <label>
        Bio
        <textarea name="bio" defaultValue={user.bio} rows={4} />
      </label>
      <label>
        Image URL
        <input name="image" defaultValue={user.image} />
      </label>
      <label>
        New password
        <input
          name="password"
          type="password"
          placeholder="Leave blank to keep current password"
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Update settings'}
      </button>
    </form>
  );
}
