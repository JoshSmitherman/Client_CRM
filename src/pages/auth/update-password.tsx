import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import { PasswordRules } from '@/components/ui/password-rules';
import { useDocumentTitle } from '@/lib/use-document-title';

export function UpdatePasswordPage() {
  useDocumentTitle('Set a new password');

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
