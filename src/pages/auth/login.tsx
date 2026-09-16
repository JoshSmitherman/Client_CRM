import { Link, Navigate } from 'react-router-dom';

import { LoginForm } from '@/components/auth/login-form';
import { useAuth } from '@/lib/auth-context';
import { homePathForRole } from '@/lib/session';
import { useDocumentTitle } from '@/lib/use-document-title';

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { profile, isLoading } = useAuth();

  // Someone who is already signed in has no business on a sign-in form.
  if (!isLoading && profile) return <Navigate to={homePathForRole(profile.role)} replace />;

  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Welcome back. Enter your details to continue.
      </p>

      <LoginForm />

      <p className="mt-6 text-[13px]">
        <Link to="/reset-password" className="font-medium text-[var(--accent-text)] hover:underline">
          Forgotten your password?
        </Link>
      </p>

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-[13px]">
        <p className="text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Agency staff:</span>{' '}
          <Link to="/signup" className="font-medium text-[var(--accent-text)] hover:underline">
            create an account
          </Link>{' '}
          with your work email address.
        </p>
        <p className="mt-1.5 text-[var(--text-muted)]">
          Clients are given access by their account manager — get in touch if you need a login.
        </p>
      </div>
    </>
  );
}
