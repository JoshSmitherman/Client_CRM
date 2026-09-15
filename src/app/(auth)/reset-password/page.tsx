import type { Metadata } from 'next';
import Link from 'next/link';

import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'Reset your password' };

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Enter your email address and we will send you a link to set a new password.
      </p>

      <ResetForm />

      <p className="mt-6 text-[13px]">
        <Link href="/login" className="font-medium text-[var(--accent-text)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
