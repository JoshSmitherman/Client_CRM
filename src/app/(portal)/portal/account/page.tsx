import type { Metadata } from 'next';

import { PasswordForm, ProfileForm } from '@/components/account/account-forms';
import { PageHeader } from '@/components/ui/page-header';
import { requireClient } from '@/lib/auth';

export const metadata: Metadata = { title: 'Your account' };

export default async function PortalAccountPage() {
  const session = await requireClient();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Your account" description="Your details and password." />
      <ProfileForm profile={session.profile} />
      <PasswordForm />
    </div>
  );
}
