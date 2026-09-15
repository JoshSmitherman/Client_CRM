import type { Metadata } from 'next';

import { PasswordRules } from '@/components/ui/password-rules';
import { UpdatePasswordForm } from './update-password-form';

export const metadata: Metadata = { title: 'Set a new password' };

export default function UpdatePasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold">Set a new password</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Choose a password you do not use anywhere else.
      </p>

      <PasswordRules className="mt-4" />
      <UpdatePasswordForm />
    </>
  );
}
