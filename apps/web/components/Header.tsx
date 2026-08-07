import Link from 'next/link';
import { logoutAction } from '@/lib/actions/auth';
import { getCurrentUser } from '@/lib/auth';

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="header">
      <nav className="container nav">
        <Link href="/" className="logo">
          conduit
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link href="/editor">New article</Link>
              <Link href="/settings">Settings</Link>
              <Link href={`/profile/${user.username}`}>{user.username}</Link>
              <form action={logoutAction} className="inline-form">
                <button type="submit" className="link-btn">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/register">Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
