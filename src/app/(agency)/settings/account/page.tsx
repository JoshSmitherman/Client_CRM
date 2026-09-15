import type { Metadata } from 'next';

import { PasswordForm, ProfileForm } from '@/components/account/account-forms';
import { PageHeader } from '@/components/ui/page-header';
import { requireAgency } from '@/lib/auth';

export const metadata: Metadata = { title: 'Your account' };

export default async function AgencyAccountPage() {
  const session = await requireAgency();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Your account"
        description="Your details and password."
        breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Your account' }]}
      />
      <ProfileForm profile={session.profile} />
      <PasswordForm />
    </div>
  );
}
