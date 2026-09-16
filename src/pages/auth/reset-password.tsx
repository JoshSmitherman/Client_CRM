import { Link } from 'react-router-dom';

import { ResetForm } from '@/components/auth/reset-form';
import { useDocumentTitle } from '@/lib/use-document-title';

export function ResetPasswordPage() {
  useDocumentTitle('Reset your password');

  return (
    <>
      <h1 className="text-xl font-semibold">Reset your password</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Enter your email address and we will send you a link to set a new password.
      </p>

      <ResetForm />

      <p className="mt-6 text-[13px]">
        <Link to="/login" className="font-medium text-[var(--accent-text)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
