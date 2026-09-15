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

      <p className="mt-6 text-[13px] text-[var(--text-muted)]">
        Accounts are created by invitation. If you need access, contact your account manager.
      </p>
      <p className="mt-2 text-[13px]">
        <Link href="/reset-password" className="font-medium text-[var(--accent-text)] hover:underline">
          Forgotten your password?
        </Link>
      </p>
    </>
  );
}
