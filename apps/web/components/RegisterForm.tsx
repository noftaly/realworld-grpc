'use client';

import { useActionState } from 'react';
import { registerAction } from '@/lib/actions/auth';

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    undefined,
  );
  return (
    <form action={formAction} className="form">
      {state?.error && <p className="error">{state.error}</p>}
      <label>
        Username
        <input name="username" required />
      </label>
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Signing up…' : 'Sign up'}
      </button>
    </form>
  );
}
