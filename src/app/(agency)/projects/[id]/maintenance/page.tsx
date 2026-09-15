import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';

import { AllowanceMeter } from '@/components/maintenance/allowance-meter';
import { SubscriptionFormToggle } from '@/components/maintenance/subscription-form';
import { UsageTable, type UsageRow } from '@/components/maintenance/usage-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  BILLING_FREQUENCY_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
} from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import { getClients } from '@/lib/queries/clients';
import { getAllowance, getPlans, getUsageHistory } from '@/lib/queries/maintenance';
import { getProject } from '@/lib/queries/projects';
import { createClient } from '@/lib/supabase/server';

export default async function ProjectMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const project = await getProject(id);
  if (!project) notFound();

  const client = project.clients as unknown as { id: string; company_name: string };
  const supabase = await createClient();

  const [{ data: subscription }, plans, clients] = await Promise.all([
    supabase
      .from('maintenance_subscriptions')
      .select('*, maintenance_plans!inner ( id, name, included_services, response_time_hours )')
      .eq('project_id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    getPlans(),
    getClients(),
  ]);

  if (!subscription) {
    return (
      <Card>
        <EmptyState
          icon={ShieldCheck}
          title="No maintenance plan for this website"
          description="Set one up to track allowances, renewals and covered work."
          action={
            <SubscriptionFormToggle
              label="Set up a subscription"
              clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
              projects={[{ id, name: project.name }]}
              plans={plans}
              defaultClientId={client.id}
              defaultProjectId={id}
            />
          }
        />
      </Card>
    );
  }

  const plan = subscription.maintenance_plans as unknown as {
    name: string;
    included_services: string[];
  };

  const [allowance, usage] = await Promise.all([
    getAllowance(subscription.id, {
      change: subscription.included_change_minutes,
      support: subscription.included_support_minutes,
    }),
    getUsageHistory(subscription.id, 20),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader
            title={plan.name}
            description={`${formatCurrency(subscription.price, subscription.currency)} ${BILLING_FREQUENCY_LABELS[subscription.billing_cycle].toLowerCase()} · renews ${formatDate(subscription.renewal_date)}`}
            action={
              <Badge tone={SUBSCRIPTION_STATUS_TONES[subscription.status]} dot>
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
              </Badge>
            }
          />
          <CardBody>
            <AllowanceMeter allowance={allowance} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent work" />
          <UsageTable usage={usage as unknown as UsageRow[]} linkBase="/change-requests" />
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Manage" />
          <CardBody className="space-y-3">
            <SubscriptionFormToggle
              label="Edit subscription"
              subscription={subscription}
              clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
              projects={[{ id, name: project.name }]}
              plans={plans}
            />
            <Link
              href={`/maintenance/${subscription.id}`}
              className="block text-[13px] font-medium text-[var(--accent-text)] hover:underline"
            >
              Full usage history and events
            </Link>
          </CardBody>
        </Card>

        {plan.included_services.length > 0 ? (
          <Card>
            <CardHeader title="Included" />
            <CardBody>
              <ul className="space-y-1 text-[13px]">
                {plan.included_services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
