import Link from 'next/link';
import { RegisterForm } from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="container narrow">
      <h1>Sign up</h1>
      <p className="muted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
      <RegisterForm />
    </main>
  );
}
