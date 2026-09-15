import { Alert } from '@/components/ui/alert';
import { formatDate, formatDuration } from '@/lib/format';
import type { AllowanceSummary } from '@/lib/queries/maintenance';
import { cn } from '@/lib/utils';

/**
 * Included / used / remaining for the current billing period.
 *
 * Minutes throughout, so "1 hour 20 minutes" is exact rather than a rounded
 * decimal the client would have to interpret.
 */
export function AllowanceMeter({
  allowance,
  showWarning = true,
}: {
  allowance: AllowanceSummary;
  showWarning?: boolean;
}) {
  const bars = [
    {
      label: 'Website changes',
      included: allowance.changeIncluded,
      used: allowance.changeUsed,
      remaining: allowance.changeRemaining,
    },
    {
      label: 'Support',
      included: allowance.supportIncluded,
      used: allowance.supportUsed,
      remaining: allowance.supportRemaining,
    },
  ].filter((bar) => bar.included > 0 || bar.used > 0);

  const overspent = bars.some((b) => b.included > 0 && b.used > b.included);
  const nearlyUsed = bars.some(
    (b) => b.included > 0 && b.used <= b.included && b.used / b.included >= 0.8,
  );

  if (bars.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-muted)]">
        This plan does not include an hours allowance.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {allowance.periodStart ? (
        <p className="text-[12px] text-[var(--text-muted)]">
          Period {formatDate(allowance.periodStart)} – {formatDate(allowance.periodEnd)}
        </p>
      ) : null}

      {bars.map((bar) => {
        const percent =
          bar.included === 0 ? 100 : Math.min(100, Math.round((bar.used / bar.included) * 100));
        const over = bar.included > 0 && bar.used > bar.included;

        return (
          <div key={bar.label}>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium">{bar.label}</span>
              <span className="text-[12px] tabular-nums text-[var(--text-secondary)]">
                {formatDuration(bar.used)} of {formatDuration(bar.included)} used
              </span>
            </div>

            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${bar.label} allowance used`}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-500',
                  over
                    ? 'bg-[var(--danger)]'
                    : percent >= 80
                      ? 'bg-[var(--warning)]'
                      : 'bg-[var(--success)]',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="mt-1 text-[12px] text-[var(--text-muted)]">
              {over ? (
                <span className="font-medium text-[var(--danger-text)]">
                  {formatDuration(bar.used - bar.included)} over the allowance
                </span>
              ) : (
                <>{formatDuration(bar.remaining)} remaining</>
              )}
            </p>
          </div>
        );
      })}

      {showWarning && overspent ? (
        <Alert variant="warning" title="Allowance used up">
          Further work this period is outside the included time. We will quote before doing
          anything chargeable.
        </Alert>
      ) : showWarning && nearlyUsed ? (
        <Alert variant="info">
          You have used most of this period&rsquo;s allowance. It resets on{' '}
          {formatDate(allowance.periodEnd)}.
        </Alert>
      ) : null}
    </div>
  );
}
