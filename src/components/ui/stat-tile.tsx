import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/constants';

const ICON_TONES: Record<Tone, string> = {
  neutral: 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
  info: 'bg-[var(--info-soft)] text-[var(--info-text)]',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning-text)]',
  success: 'bg-[var(--success-soft)] text-[var(--success-text)]',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger-text)]',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)]',
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</p>
        {Icon ? (
          <span
            className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ICON_TONES[tone])}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{hint}</p> : null}
    </>
  );

  const className = cn(
    'surface-card block p-4 transition-shadow',
    href && 'hover:shadow-[var(--shadow-raised)]',
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
