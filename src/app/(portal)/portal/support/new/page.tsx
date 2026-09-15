import type { Metadata } from 'next';

import { SupportForm } from '@/components/support/support-form';
import { PageHeader } from '@/components/ui/page-header';
import { requireClient } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Raise a support request' };

export default async function NewSupportPage() {
  await requireClient();
  const supabase = await createClient();

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

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Raise a support request"
        breadcrumbs={[{ label: 'Support', href: '/portal/support' }, { label: 'New' }]}
      />
      <SupportForm
        projects={projects ?? []}
        planName={plan?.name ?? null}
        responseTimeHours={plan?.response_time_hours ?? null}
      />
    </div>
  );
}
