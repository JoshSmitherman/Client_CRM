import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Welcome back. Enter your details to continue.
      </p>

      <LoginForm />

      <p className="mt-6 text-[13px]">
        <Link href="/reset-password" className="font-medium text-[var(--accent-text)] hover:underline">
          Forgotten your password?
        </Link>
      </p>

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-[13px]">
        <p className="text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">Agency staff:</span>{' '}
          <Link href="/signup" className="font-medium text-[var(--accent-text)] hover:underline">
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
