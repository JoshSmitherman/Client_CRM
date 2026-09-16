import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { AllowanceMeter } from '@/components/maintenance/allowance-meter';
import { PlanCard } from '@/components/maintenance/plan-card';
import { PlanRequestForm } from '@/components/maintenance/plan-request-form';
import { UsageTable, type UsageRow } from '@/components/maintenance/usage-table';
import { QueryBoundary } from '@/components/routing/page-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import {
  BILLING_FREQUENCY_LABELS,
  CHANGE_STATUS_LABELS,
  CHANGE_STATUS_TONES,
  PLAN_REQUEST_STATUS_LABELS,
  PLAN_REQUEST_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_TONES,
} from '@/lib/constants';
import { useQuery } from '@/lib/data/use-query';
import { formatCurrency, formatDate, formatRelative } from '@/lib/format';
import {
  getAllowance,
  getPlanRequests,
  getPlans,
  getUsageHistory,
} from '@/lib/queries/maintenance';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-[14px] font-medium">{value}</p>
    </div>
  );
}

async function load() {
  const [{ data: subscription }, plans, requests, { data: settings }] = await Promise.all([
    supabase
      .from('maintenance_subscriptions')
      .select(
        '*, maintenance_plans!inner ( id, name, description, included_services, response_time_hours )',
      )
      .is('deleted_at', null)
      .order('renewal_date')
      .limit(1)
      .maybeSingle(),
    // Only plans the agency has chosen to publish reach a client, enforced by
    // the SELECT policy rather than this filter.
    getPlans(false),
    getPlanRequests(),
    supabase.from('agency_settings').select('allow_client_plan_selection').maybeSingle(),
  ]);

  const canRequestChange = settings?.allow_client_plan_selection ?? true;

  if (!subscription) {
    return { subscription: null, plans, requests, canRequestChange } as const;
  }

  const [allowance, usage, { data: openRequests }, { data: completedRequests }] =
    await Promise.all([
      getAllowance(subscription.id, {
        change: subscription.included_change_minutes,
        support: subscription.included_support_minutes,
      }),
      getUsageHistory(subscription.id, 30),
      supabase
        .from('change_requests')
        .select('id, reference, title, status, submitted_at')
        .not('status', 'in', '("completed","rejected","cancelled")')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(5),
      supabase
        .from('change_requests')
        .select('id, reference, title, status, completed_at')
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })
        .limit(5),
    ]);

  return {
    subscription,
    plans,
    requests,
    canRequestChange,
    allowance,
    usage,
    openRequests: openRequests ?? [],
    completedRequests: completedRequests ?? [],
  } as const;
}

export function PortalMaintenancePage() {
  useDocumentTitle('Maintenance');
  const query = useQuery(load, []);

  return (
    <QueryBoundary query={query}>
      {(data) => {
        if (!data.subscription) {
          return (
            <>
              <PageHeader
                title="Maintenance"
                description="Keep your website secure, backed up and up to date."
              />

              <Card className="mb-4">
                <EmptyState
                  icon={ShieldCheck}
                  title="You do not have a maintenance plan"
                  description="A plan keeps your website monitored, updated and backed up, with time included for changes each month."
                />
              </Card>

              {data.plans.length > 0 ? (
                <>
                  <h2 className="mt-6 mb-3 text-[15px] font-semibold">Available plans</h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {data.plans.map((plan) => (
                      <PlanCard key={plan.id} plan={plan} />
                    ))}
                  </div>

                  {data.canRequestChange ? (
                    <div className="mt-4 max-w-xl">
                      <PlanRequestForm
                        subscriptionId={null}
                        plans={data.plans}
                        currentPlanId={null}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}
            </>
          );
        }

        const {
          subscription,
          plans,
          requests,
          canRequestChange,
          allowance,
          usage,
          openRequests,
          completedRequests,
        } = data;

        const plan = subscription.maintenance_plans as unknown as {
          id: string;
          name: string;
          description: string | null;
          included_services: string[];
          response_time_hours: number | null;
        };

        return (
          <>
            <PageHeader
              title="Your maintenance plan"
              description="What is included, what you have used, and what we have been doing."
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader
                    title={plan.name}
                    description={plan.description ?? undefined}
                    action={
                      <Badge tone={SUBSCRIPTION_STATUS_TONES[subscription.status]} dot>
                        {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                      </Badge>
                    }
                  />
                  <CardBody className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Detail
                        label="Cost"
                        value={`${formatCurrency(subscription.price, subscription.currency)} ${BILLING_FREQUENCY_LABELS[
                          subscription.billing_cycle
                        ].toLowerCase()}`}
                      />
                      <Detail label="Renews" value={formatDate(subscription.renewal_date)} />
                      <Detail
                        label="Response time"
                        value={
                          plan.response_time_hours
                            ? `Within ${plan.response_time_hours} hours`
                            : '—'
                        }
                      />
                    </div>

                    <div className="border-t border-[var(--border-subtle)] pt-4">
                      <AllowanceMeter allowance={allowance} />
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader
                    title="What we have done"
                    description="Time recorded against your plan."
                  />
                  <UsageTable
                    usage={usage as unknown as UsageRow[]}
                    linkBase="/portal/requests"
                  />
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader title="Open requests" />
                    {openRequests.length === 0 ? (
                      <EmptyState title="None open" description="Nothing in progress." />
                    ) : (
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {openRequests.map((cr) => (
                          <li key={cr.id}>
                            <Link
                              to={`/portal/requests/${cr.id}`}
                              className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block truncate text-[13px] font-medium">
                                {cr.title}
                              </span>
                              <span className="mt-1 block">
                                <Badge tone={CHANGE_STATUS_TONES[cr.status]}>
                                  {CHANGE_STATUS_LABELS[cr.status]}
                                </Badge>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card>
                    <CardHeader title="Completed" />
                    {completedRequests.length === 0 ? (
                      <EmptyState title="Nothing yet" description="Finished work appears here." />
                    ) : (
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {completedRequests.map((cr) => (
                          <li key={cr.id}>
                            <Link
                              to={`/portal/requests/${cr.id}`}
                              className="block px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
                            >
                              <span className="block truncate text-[13px] font-medium">
                                {cr.title}
                              </span>
                              <span className="block text-[12px] text-[var(--text-muted)]">
                                {cr.completed_at ? formatRelative(cr.completed_at) : ''}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                {plan.included_services.length > 0 ? (
                  <Card>
                    <CardHeader title="What is included" />
                    <CardBody>
                      <ul className="space-y-1.5 text-[13px]">
                        {plan.included_services.map((service) => (
                          <li key={service}>{service}</li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                ) : null}

                {requests.length > 0 ? (
                  <Card>
                    <CardHeader title="Your plan requests" />
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {requests.map((request) => (
                        <li key={request.id} className="px-5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[13px] font-medium">
                              {PLAN_REQUEST_TYPE_LABELS[request.requested_type]}
                            </span>
                            <Badge
                              tone={
                                request.status === 'approved'
                                  ? 'success'
                                  : request.status === 'declined'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {PLAN_REQUEST_STATUS_LABELS[request.status]}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                            {formatRelative(request.created_at)}
                          </p>
                          {request.response_notes ? (
                            <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                              {request.response_notes}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}

                {canRequestChange ? (
                  <PlanRequestForm
                    subscriptionId={subscription.id}
                    plans={plans}
                    currentPlanId={plan.id}
                  />
                ) : null}

                {plans.filter((p) => p.id !== plan.id).length > 0 ? (
                  <div className="space-y-3">
                    <h2 className="text-[15px] font-semibold">Other plans</h2>
                    {plans
                      .filter((p) => p.id !== plan.id)
                      .map((other) => (
                        <PlanCard key={other.id} plan={other} />
                      ))}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        );
      }}
    </QueryBoundary>
  );
}
