import Link from 'next/link';
import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="container narrow">
      <h1>Sign in</h1>
      <p className="muted">
        Need an account? <Link href="/register">Sign up</Link>
      </p>
      <LoginForm />
    </main>
  );
}
