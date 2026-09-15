import { Check } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { BILLING_FREQUENCY_LABELS } from '@/lib/constants';
import { formatCurrency, formatDuration } from '@/lib/format';
import type { Tables } from '@/lib/supabase/database.types';
import { cn } from '@/lib/utils';

export function PlanCard({
  plan,
  current = false,
  action,
  showInternal = false,
}: {
  plan: Tables<'maintenance_plans'>;
  current?: boolean;
  action?: React.ReactNode;
  showInternal?: boolean;
}) {
  return (
    <Card className={cn('flex flex-col', current && 'ring-2 ring-[var(--accent)]')}>
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold">{plan.name}</h3>
          {current ? <Badge tone="accent">Your plan</Badge> : null}
          {showInternal && !plan.is_active ? <Badge tone="neutral">Inactive</Badge> : null}
          {showInternal && plan.is_active && !plan.is_public ? (
            <Badge tone="warning">Hidden from clients</Badge>
          ) : null}
        </div>

        {plan.description ? (
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{plan.description}</p>
        ) : null}

        <p className="mt-3">
          <span className="text-2xl font-semibold tabular-nums">
            {formatCurrency(plan.monthly_price, plan.currency)}
          </span>
          <span className="text-[13px] text-[var(--text-muted)]"> / month</span>
        </p>

        {plan.annual_price ? (
          <p className="text-[12px] text-[var(--text-muted)]">
            or {formatCurrency(plan.annual_price, plan.currency)} a year
          </p>
        ) : null}

        <dl className="mt-3 space-y-1 border-t border-[var(--border-subtle)] pt-3 text-[12px]">
          {plan.included_change_minutes > 0 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Website changes</dt>
              <dd className="font-medium">{formatDuration(plan.included_change_minutes)} a month</dd>
            </div>
          ) : null}
          {plan.included_support_minutes > 0 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Support</dt>
              <dd className="font-medium">{formatDuration(plan.included_support_minutes)} a month</dd>
            </div>
          ) : null}
          {plan.response_time_hours ? (
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--text-muted)]">Response time</dt>
              <dd className="font-medium">Within {plan.response_time_hours} hours</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--text-muted)]">Billing</dt>
            <dd className="font-medium">{BILLING_FREQUENCY_LABELS[plan.billing_frequency]}</dd>
          </div>
        </dl>

        {plan.included_services.length > 0 ? (
          <ul className="mt-3 flex-1 space-y-1.5 border-t border-[var(--border-subtle)] pt-3">
            {plan.included_services.map((service) => (
              <li key={service} className="flex items-start gap-2 text-[13px]">
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]"
                  aria-hidden="true"
                />
                {service}
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1" />
        )}

        {action ? <div className="mt-4">{action}</div> : null}
      </CardBody>
    </Card>
  );
}
