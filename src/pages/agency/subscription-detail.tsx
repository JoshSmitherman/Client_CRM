import { Link, useParams } from 'react-router-dom';

import { AllowanceMeter } from '@/components/maintenance/allowance-meter';
import { RecordUsageForm } from '@/components/maintenance/record-usage-form';
import { UsageTable, type UsageRow } from '@/components/maintenance/usage-table';
import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { DetailRow } from '@/components/ui/detail-row';
import { PageHeader } from '@/components/ui/page-header';
import { Timeline } from '@/components/ui/timeline';
import {
  BILLING_FREQUENCY_LABELS,
  MAINTENANCE_EVENT_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatCurrency, formatDate } from '@/lib/format';
import { getInternalNote } from '@/lib/internal-notes';
import {
  getAllowance,
  getSubscription,
  getSubscriptionEvents,
  getUsageHistory,
} from '@/lib/queries/maintenance';
import { useDocumentTitle } from '@/lib/use-document-title';
import { NotFoundPage } from '@/pages/not-found';

async function load(id: string) {
  const subscription = await getSubscription(id);
  if (!subscription) return null;

  const [allowance, usage, events, internalNote] = await Promise.all([
    getAllowance(id, {
      change: subscription.included_change_minutes,
      support: subscription.included_support_minutes,
    }),
    getUsageHistory(id),
    getSubscriptionEvents(id),
    getInternalNote('maintenance_subscription', id),
  ]);

  return { subscription, allowance, usage, events, internalNote };
}

export function SubscriptionDetailPage() {
  const { id = '' } = useParams();
  const query = useQuery(() => load(id), [id]);

  const company = (
    query.data?.subscription.clients as unknown as { company_name: string } | undefined
  )?.company_name;
  useDocumentTitle(company ? `${company} maintenance` : 'Subscription');

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data) return <NotFoundPage />;
        const { subscription, allowance, usage, events, internalNote } = data;

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
                    <DetailRow label="Client">
                      <Link to={`/clients/${client.id}`} className="hover:underline">
                        {client.company_name}
                      </Link>
                    </DetailRow>
                    <DetailRow label="Website">
                      {project ? (
                        <Link to={`/projects/${project.id}`} className="hover:underline">
                          {project.name}
                        </Link>
                      ) : (
                        (subscription.website_url ?? '—')
                      )}
                    </DetailRow>
                    <DetailRow label="Started">{formatDate(subscription.start_date)}</DetailRow>
                    <DetailRow label="Renews">{formatDate(subscription.renewal_date)}</DetailRow>
                    <DetailRow label="Response time">
                      {plan.response_time_hours
                        ? `Within ${plan.response_time_hours} hours`
                        : '—'}
                    </DetailRow>
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
                              from && to && from.name !== to.name
                                ? `${from.name} → ${to.name}`
                                : null,
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
      }}
    </QueryBoundary>
  );
}
