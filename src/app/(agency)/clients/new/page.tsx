import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ClientForm } from '@/components/clients/client-form';
import { PageHeader } from '@/components/ui/page-header';
import { createClientAction } from '@/lib/actions/clients';
import { requireAgency } from '@/lib/auth';
import { isAgencyManager } from '@/lib/permissions';
import { getAccountManagers } from '@/lib/queries/clients';

export const metadata: Metadata = { title: 'New client' };

export default async function NewClientPage() {
  const session = await requireAgency();
  if (!isAgencyManager(session.profile.role)) redirect('/clients');

  const accountManagers = await getAccountManagers();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New client"
        description="Creates the organisation their portal users will belong to."
        breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: 'New' }]}
      />
      <ClientForm
        action={createClientAction}
        internalNote=""
        accountManagers={accountManagers}
        submitLabel="Create client"
        cancelHref="/clients"
      />
    </div>
  );
}
