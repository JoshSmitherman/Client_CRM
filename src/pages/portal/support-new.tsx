import { QueryBoundary } from '@/components/routing/page-state';
import { SupportForm } from '@/components/support/support-form';
import { PageHeader } from '@/components/ui/page-header';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

async function load() {
  const [{ data: projects }, { data: subscription }] = await Promise.all([
    supabase.from('projects').select('id, name').is('deleted_at', null).order('name'),
    supabase
      .from('maintenance_subscriptions')
      .select('id, maintenance_plans!inner ( name, response_time_hours )')
      .in('status', ['active', 'trial', 'renewal_due'])
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle(),
  ]);

  const plan = subscription?.maintenance_plans as unknown as
    | { name: string; response_time_hours: number | null }
    | null;

  return {
    projects: projects ?? [],
    planName: plan?.name ?? null,
    responseTimeHours: plan?.response_time_hours ?? null,
  };
}

export function PortalNewSupportPage() {
  useDocumentTitle('Raise a support request');
  const query = useQuery(load, []);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Raise a support request"
        breadcrumbs={[{ label: 'Support', href: '/portal/support' }, { label: 'New' }]}
      />
      <QueryBoundary query={query}>
        {({ projects, planName, responseTimeHours }) => (
          <SupportForm
            projects={projects}
            planName={planName}
            responseTimeHours={responseTimeHours}
          />
        )}
      </QueryBoundary>
    </div>
  );
}
