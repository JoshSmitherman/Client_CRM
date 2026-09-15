import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ClientForm } from '@/components/clients/client-form';
import { PageHeader } from '@/components/ui/page-header';
import { updateClientAction } from '@/lib/actions/clients';
import { requireAgency } from '@/lib/auth';
import { getAccountManagers, getClient } from '@/lib/queries/clients';

export const metadata: Metadata = { title: 'Edit client' };

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAgency();
  const { id } = await params;

  const [client, accountManagers] = await Promise.all([getClient(id), getAccountManagers()]);
  if (!client) notFound();

  // Bind the id server-side so the client component cannot target another record.
  const action = updateClientAction.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={`Edit ${client.company_name}`}
        breadcrumbs={[
          { label: 'Clients', href: '/clients' },
          { label: client.company_name, href: `/clients/${id}` },
          { label: 'Edit' },
        ]}
      />
      <ClientForm
        action={action}
        client={client}
        accountManagers={accountManagers}
        submitLabel="Save changes"
        cancelHref={`/clients/${id}`}
      />
    </div>
  );
}
