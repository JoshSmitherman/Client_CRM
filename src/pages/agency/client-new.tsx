import { Navigate } from 'react-router-dom';

import { ClientForm } from '@/components/clients/client-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { PageHeader } from '@/components/ui/page-header';
import { createClientAction } from '@/lib/actions/clients';
import { useProfile } from '@/lib/auth-context';
import { useQuery } from '@/lib/data/use-query';
import { isAgencyManager } from '@/lib/permissions';
import { getAccountManagers } from '@/lib/queries/clients';
import { useDocumentTitle } from '@/lib/use-document-title';

export function NewClientPage() {
  useDocumentTitle('New client');
  const profile = useProfile();
  const query = useQuery(getAccountManagers, []);

  if (!isAgencyManager(profile.role)) return <Navigate to="/clients" replace />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New client"
        description="Creates the organisation their portal users will belong to."
        breadcrumbs={[{ label: 'Clients', href: '/clients' }, { label: 'New' }]}
      />
      <QueryBoundary query={query}>
        {(accountManagers) => (
          <ClientForm
            action={createClientAction}
            internalNote=""
            accountManagers={accountManagers}
            submitLabel="Create client"
            cancelHref="/clients"
          />
        )}
      </QueryBoundary>
    </div>
  );
}
