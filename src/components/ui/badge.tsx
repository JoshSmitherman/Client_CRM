import type { Tone } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const TONES: Record<Tone, string> = {
  neutral:
    'bg-[var(--surface-sunken)] text-[var(--text-secondary)] ring-[var(--border-strong)]',
  info: 'bg-[var(--info-soft)] text-[var(--info-text)] ring-[var(--info)]/30',
  warning: 'bg-[var(--warning-soft)] text-[var(--warning-text)] ring-[var(--warning)]/30',
  success: 'bg-[var(--success-soft)] text-[var(--success-text)] ring-[var(--success)]/30',
  danger: 'bg-[var(--danger-soft)] text-[var(--danger-text)] ring-[var(--danger)]/30',
  accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)] ring-[var(--accent)]/30',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  /** Adds a leading status dot — useful where the label alone reads as plain text. */
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5',
        'text-[12px] font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
