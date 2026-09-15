import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

export interface AttentionItem {
  id: string;
  href: string;
  title: string;
  meta?: string;
  trailing?: ReactNode;
}

/** A panel of things waiting on somebody, used across the agency dashboard. */
export function AttentionList({
  title,
  description,
  icon,
  items,
  emptyMessage,
  viewAllHref,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  items: AttentionItem[];
  emptyMessage: string;
  viewAllHref?: string;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title={title}
        description={description}
        action={
          viewAllHref && items.length > 0 ? (
            <Link
              href={viewAllHref}
              className="text-[13px] font-medium text-[var(--accent-text)] hover:underline"
            >
              View all
            </Link>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={icon} title="Nothing to action" description={emptyMessage} />
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{item.title}</span>
                  {item.meta ? (
                    <span className="block truncate text-[12px] text-[var(--text-muted)]">
                      {item.meta}
                    </span>
                  ) : null}
                </span>
                {item.trailing}
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-[var(--text-muted)]"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
