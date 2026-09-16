import { PasswordForm, ProfileForm } from '@/components/account/account-forms';
import { PageHeader } from '@/components/ui/page-header';
import { useProfile } from '@/lib/auth-context';
import { useDocumentTitle } from '@/lib/use-document-title';

/** Shared by agency staff and portal users; the shell differs, the form does not. */
export function AccountPage() {
  useDocumentTitle('Your account');
  const profile = useProfile();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Your account" description="Your details and password." />
      <ProfileForm profile={profile} />
      <PasswordForm />
    </div>
  );
}
