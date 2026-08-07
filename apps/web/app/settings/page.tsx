import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/SettingsForm';
import { logoutAction } from '@/lib/actions/auth';
import { getCurrentUser } from '@/lib/auth';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <main className="container narrow">
      <h1>Settings</h1>
      <SettingsForm user={user} />
      <form
        action={logoutAction}
        className="inline-form"
        style={{ marginTop: '1.5rem' }}
      >
        <button type="submit" className="btn-secondary">
          Sign out
        </button>
      </form>
    </main>
  );
}
