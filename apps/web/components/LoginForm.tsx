'use client';

import { useActionState } from 'react';
import { loginAction } from '@/lib/actions/auth';

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  return (
    <form action={formAction} className="form">
      {state?.error && <p className="error">{state.error}</p>}
      <label>
        Email
        <input name="email" type="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
