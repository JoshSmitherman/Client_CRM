import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AllowanceMeter } from '@/components/maintenance/allowance-meter';
import { RecordUsageForm } from '@/components/maintenance/record-usage-form';
import { UsageTable, type UsageRow } from '@/components/maintenance/usage-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Timeline } from '@/components/ui/timeline';
import {
  BILLING_FREQUENCY_LABELS,
  MAINTENANCE_EVENT_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
} from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import { getInternalNote } from '@/lib/internal-notes';
import {
  getAllowance,
  getSubscription,
  getSubscriptionEvents,
  getUsageHistory,
} from '@/lib/queries/maintenance';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sub = await getSubscription(id);
  const client = sub?.clients as unknown as { company_name: string } | undefined;
  return { title: client ? `${client.company_name} maintenance` : 'Subscription' };
}

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAgency();
  const { id } = await params;

  const subscription = await getSubscription(id);
  if (!subscription) notFound();

  const [allowance, usage, events, internalNote] = await Promise.all([
    getAllowance(id, {
      change: subscription.included_change_minutes,
      support: subscription.included_support_minutes,
    }),
    getUsageHistory(id),
    getSubscriptionEvents(id),
    getInternalNote('maintenance_subscription', id),
  ]);

  const client = subscription.clients as unknown as { id: string; company_name: string };
  const project = subscription.projects as unknown as { id: string; name: string } | null;
  const plan = subscription.maintenance_plans as unknown as {
    name: string;
    included_services: string[];
    response_time_hours: number | null;
  };

  return (
    <>
      <PageHeader
        title={`${client.company_name} — ${plan.name}`}
        breadcrumbs={[
          { label: 'Maintenance', href: '/maintenance' },
          { label: client.company_name },
        ]}
        meta={
          <>
            <Badge tone={SUBSCRIPTION_STATUS_TONES[subscription.status]} dot>
              {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
            </Badge>
            <span className="text-[12px] text-[var(--text-muted)]">
              {formatCurrency(subscription.price, subscription.currency)}{' '}
              {BILLING_FREQUENCY_LABELS[subscription.billing_cycle].toLowerCase()} · renews{' '}
              {formatDate(subscription.renewal_date)}
              {subscription.auto_renew ? ' automatically' : ' (no auto-renew)'}
            </span>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="This period's allowance" />
            <CardBody>
              <AllowanceMeter allowance={allowance} />
            </CardBody>
          </Card>

          <RecordUsageForm subscriptionId={id} />

          <Card>
            <CardHeader title="Usage history" description={`${usage.length} entries`} />
            <UsageTable usage={usage as unknown as UsageRow[]} linkBase="/change-requests" />
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="space-y-2.5 text-[13px]">
              <Row label="Client">
                <Link href={`/clients/${client.id}`} className="hover:underline">
                  {client.company_name}
                </Link>
              </Row>
              <Row label="Website">
                {project ? (
                  <Link href={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                ) : (
                  (subscription.website_url ?? '—')
                )}
              </Row>
              <Row label="Started">{formatDate(subscription.start_date)}</Row>
              <Row label="Renews">{formatDate(subscription.renewal_date)}</Row>
              <Row label="Response time">
                {plan.response_time_hours ? `Within ${plan.response_time_hours} hours` : '—'}
              </Row>
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

          {internalNote ? (
            <Card>
              <CardHeader title="Internal notes" />
              <CardBody>
                <p className="text-[13px] whitespace-pre-wrap text-[var(--text-secondary)]">
                  {internalNote}
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Subscription history"
              description="Permanent — edits never overwrite it."
            />
            <CardBody>
              {events.length === 0 ? (
                <p className="text-[13px] text-[var(--text-muted)]">Nothing recorded yet.</p>
              ) : (
                <Timeline
                  entries={events.map((event) => {
                    const actor = event.actor as unknown as { full_name: string } | null;
                    const from = event.from_plan as unknown as { name: string } | null;
                    const to = event.to_plan as unknown as { name: string } | null;
                    return {
                      id: event.id,
                      title: MAINTENANCE_EVENT_LABELS[event.event_type],
                      meta: [
                        actor?.full_name,
                        from && to && from.name !== to.name ? `${from.name} → ${to.name}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · '),
                      body: event.notes ?? undefined,
                      timestamp: event.created_at,
                      tone: 'neutral' as const,
                    };
                  })}
                />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
