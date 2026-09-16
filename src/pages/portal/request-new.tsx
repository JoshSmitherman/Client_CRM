import { useSearchParams } from 'react-router-dom';

import { ChangeRequestForm } from '@/components/change-requests/request-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

async function load() {
  const [{ data: projects }, { data: subscription }] = await Promise.all([
    supabase.from('projects').select('id, name').is('deleted_at', null).order('name'),
    supabase
      .from('maintenance_subscriptions')
      .select('id')
      .in('status', ['active', 'trial', 'renewal_due'])
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
  ]);

  return { projects: projects ?? [], coveredByPlan: Boolean(subscription) };
}

export function PortalNewRequestPage() {
  useDocumentTitle('Submit a change request');
  const [params] = useSearchParams();
  const defaultProjectId = params.get('project') ?? undefined;

  const query = useQuery(load, []);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Submit a change request"
        breadcrumbs={[{ label: 'Requests', href: '/portal/requests' }, { label: 'New' }]}
      />
      <QueryBoundary query={query}>
        {({ projects, coveredByPlan }) => (
          <ChangeRequestForm
            projects={projects}
            defaultProjectId={defaultProjectId}
            coveredByPlan={coveredByPlan}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
