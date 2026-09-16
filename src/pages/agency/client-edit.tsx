import { useParams } from 'react-router-dom';

import { ClientForm } from '@/components/clients/client-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { PageHeader } from '@/components/ui/page-header';
import { updateClientAction } from '@/lib/actions/clients';
import { useQuery } from '@/lib/data/use-query';
import { getInternalNote } from '@/lib/internal-notes';
import { getAccountManagers, getClient } from '@/lib/queries/clients';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const [client, accountManagers, internalNote] = await Promise.all([
    getClient(id),
    getAccountManagers(),
    getInternalNote('client', id),
  ]);

  return client ? { client, accountManagers, internalNote } : null;
}

export function EditClientPage() {
  useDocumentTitle('Edit client');
  const { id = '' } = useParams();
  const query = useQuery(() => load(id), [id]);

  return (
    <div className="mx-auto max-w-3xl">
      <QueryBoundary query={query}>
        {(data) => {
          if (!data) return <NotFoundPage />;
          const { client, accountManagers, internalNote } = data;

          return (
            <>
              <PageHeader
                title={`Edit ${client.company_name}`}
                breadcrumbs={[
                  { label: 'Clients', href: '/clients' },
                  { label: client.company_name, href: `/clients/${id}` },
                  { label: 'Edit' },
                ]}
              />
              <ClientForm
                // The id is bound here rather than posted in the form, so the
                // form cannot be pointed at another record.
                action={updateClientAction.bind(null, id)}
                client={client}
                internalNote={internalNote}
                accountManagers={accountManagers}
                submitLabel="Save changes"
                cancelHref={`/clients/${id}`}
              />
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
