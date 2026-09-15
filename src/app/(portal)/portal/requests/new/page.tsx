import type { Metadata } from 'next';

import { ChangeRequestForm } from '@/components/change-requests/request-form';
import { PageHeader } from '@/components/ui/page-header';
import { requireClient } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Submit a change request' };

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireClient();
  const { project } = await searchParams;

  const supabase = await createClient();

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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Submit a change request"
        breadcrumbs={[{ label: 'Requests', href: '/portal/requests' }, { label: 'New' }]}
      />
      <ChangeRequestForm
        projects={projects ?? []}
        defaultProjectId={project}
        coveredByPlan={Boolean(subscription)}
      />
    </div>
  );
}
