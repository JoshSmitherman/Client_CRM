import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

import { AllowanceMeter } from '@/components/maintenance/allowance-meter';
import { PlanCard } from '@/components/maintenance/plan-card';
import { PlanFormToggle } from '@/components/maintenance/plan-form';
import { PlanRequestPanel, type PlanRequestRow } from '@/components/maintenance/plan-request-panel';
import { ReminderList, type ReminderRow } from '@/components/maintenance/reminder-list';
import { SubscriptionFormToggle } from '@/components/maintenance/subscription-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_TONES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { requireAgency } from '@/lib/auth';
import { isAgencyAdmin } from '@/lib/permissions';
import { getClients } from '@/lib/queries/clients';
import { getInternalNotes } from '@/lib/internal-notes';
import {
  getAllowance,
  getPlanRequests,
  getPlans,
  getReminders,
  getSubscriptions,
  sweepMaintenanceState,
} from '@/lib/queries/maintenance';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Maintenance' };

const TABS = [
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'plans', label: 'Plans' },
  { key: 'reminders', label: 'Reminders' },
  { key: 'requests', label: 'Plan requests' },
] as const;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireAgency();
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab)?.key ?? 'subscriptions';

  // Keeps statuses honest whenever someone looks at this page, so a renewal
  // never sits silently past its date waiting for a cron job.
  await sweepMaintenanceState();

  const supabase = await createClient();

  const [plans, subscriptions, reminders, requests, clients, { data: projects }] =
    await Promise.all([
      getPlans(),
      getSubscriptions(),
      getReminders(),
      getPlanRequests(),
      getClients(),
      supabase.from('projects').select('id, name').is('deleted_at', null).order('name'),
    ]);

  const pendingRequests = requests.filter((r) => r.status === 'pending').length;

  // One query for every note on the page rather than one per subscription.
  const notes = await getInternalNotes(
    'maintenance_subscription',
    subscriptions.map((s) => s.id),
  );

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Plans, subscriptions, allowances and renewals."
        actions={
          active === 'plans' && isAgencyAdmin(session.profile.role) ? (
            <PlanFormToggle label="New plan" />
          ) : active === 'subscriptions' ? (
            <SubscriptionFormToggle
              label="New subscription"
              internalNote=""
              clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
              projects={projects ?? []}
              plans={plans}
            />
          ) : null
        }
      />

      <nav
        className="mb-5 -mb-px flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
        aria-label="Maintenance sections"
      >
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/maintenance?tab=${t.key}`}
            aria-current={active === t.key ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active === t.key
                ? 'border-[var(--accent)] text-[var(--accent-text)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
            )}
          >
            {t.label}
            {t.key === 'requests' && pendingRequests > 0 ? (
              <span className="rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-bold text-white tabular-nums">
                {pendingRequests}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {active === 'subscriptions' ? (
        subscriptions.length === 0 ? (
          <Card>
            <EmptyState
              icon={ShieldCheck}
              title="No subscriptions yet"
              description="Set one up to start tracking allowances and renewals."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {await Promise.all(
              subscriptions.map(async (sub) => {
                const plan = sub.maintenance_plans as unknown as { id: string; name: string };
                const client = sub.clients as unknown as { id: string; company_name: string };
                const project = sub.projects as unknown as { id: string; name: string } | null;

                const allowance = await getAllowance(sub.id, {
                  change: sub.included_change_minutes,
                  support: sub.included_support_minutes,
                });

                return (
                  <Card key={sub.id}>
                    <CardHeader
                      title={
                        <span className="flex flex-wrap items-center gap-2">
                          <Link href={`/clients/${client.id}`} className="hover:underline">
                            {client.company_name}
                          </Link>
                          <Badge tone={SUBSCRIPTION_STATUS_TONES[sub.status]} dot>
                            {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                          </Badge>
                        </span>
                      }
                      description={`${plan.name} · ${formatCurrency(sub.price, sub.currency)} ${sub.billing_cycle} · renews ${formatDate(sub.renewal_date)}${project ? ` · ${project.name}` : ''}`}
                      action={
                        <SubscriptionFormToggle
                          label="Edit"
                          subscription={sub}
                          internalNote={notes.get(sub.id) ?? ''}
                          clients={clients.map((c) => ({ id: c.id, company_name: c.company_name }))}
                          projects={projects ?? []}
                          plans={plans}
                        />
                      }
                    />
                    <CardBody>
                      <AllowanceMeter allowance={allowance} showWarning={false} />
                      <div className="mt-4">
                        <Link
                          href={`/maintenance/${sub.id}`}
                          className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
                        >
                          Usage history and events
                        </Link>
                      </div>
                    </CardBody>
                  </Card>
                );
              }),
            )}
          </div>
        )
      ) : null}

      {active === 'plans' ? (
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Plans are entirely yours to define — nothing in the application depends on a particular
            name, price or allowance.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                showInternal
                action={
                  isAgencyAdmin(session.profile.role) ? (
                    <PlanFormToggle plan={plan} label="Edit plan" />
                  ) : null
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {active === 'reminders' ? (
        <Card>
          <CardHeader
            title="Upcoming"
            description="Renewals, domains, hosting, certificates, reviews and reports over the next 90 days."
          />
          <ReminderList reminders={reminders as unknown as ReminderRow[]} />
        </Card>
      ) : null}

      {active === 'requests' ? (
        <Card>
          <CardHeader
            title="Plan requests"
            description="Clients ask; you decide. Nothing changes a subscription automatically."
          />
          <PlanRequestPanel requests={requests as unknown as PlanRequestRow[]} />
        </Card>
      ) : null}
    </>
  );
}
