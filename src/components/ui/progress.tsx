import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  label,
  showValue = true,
  size = 'md',
  tone = 'accent',
  className,
}: {
  value: number;
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  const height = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-3' : 'h-2';
  const fill = {
    accent: 'bg-[var(--accent)]',
    success: 'bg-[var(--success)]',
    warning: 'bg-[var(--warning)]',
    danger: 'bg-[var(--danger)]',
  }[tone];

  return (
    <div className={className}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? (
            <span className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</span>
          ) : null}
          {showValue ? (
            <span className="text-[13px] font-semibold tabular-nums">{clamped}%</span>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn('w-full overflow-hidden rounded-full bg-[var(--surface-sunken)]', height)}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', fill)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
