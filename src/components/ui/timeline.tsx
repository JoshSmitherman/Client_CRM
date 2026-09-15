import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { formatDateTime, formatRelative } from '@/lib/format';

export interface TimelineEntry {
  id: string;
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
  timestamp: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
}

const DOT_TONES = {
  neutral: 'bg-[var(--border-strong)]',
  accent: 'bg-[var(--accent)]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
} as const;

export function Timeline({ entries, className }: { entries: TimelineEntry[]; className?: string }) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {entries.map((entry, index) => (
        <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
          {/* Connector line, hidden on the final entry. */}
          {index < entries.length - 1 ? (
            <span
              className="absolute top-3 left-[5px] h-full w-px bg-[var(--border-subtle)]"
              aria-hidden="true"
            />
          ) : null}
          <span
            className={cn(
              'relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-[var(--surface-card)]',
              DOT_TONES[entry.tone ?? 'neutral'],
            )}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[13px] font-medium">{entry.title}</p>
              <time
                dateTime={entry.timestamp}
                title={formatDateTime(entry.timestamp)}
                className="text-[12px] whitespace-nowrap text-[var(--text-muted)]"
              >
                {formatRelative(entry.timestamp)}
              </time>
            </div>
            {entry.meta ? (
              <p className="text-[12px] text-[var(--text-muted)]">{entry.meta}</p>
            ) : null}
            {entry.body ? (
              <div className="mt-1 text-[13px] text-[var(--text-secondary)]">{entry.body}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
