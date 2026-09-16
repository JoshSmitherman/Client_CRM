import type { ReactNode } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { QueryState } from '@/lib/data/use-query';

/**
 * Renders the loading and error states around a query, so every screen handles
 * them the same way instead of each inventing its own.
 *
 * Once data has arrived a refetch keeps the previous content on screen rather
 * than flashing back to skeletons.
 */
export function QueryBoundary<T>({
  query,
  children,
  skeleton,
  emptyLabel = 'Nothing to show.',
}: {
  query: QueryState<T>;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  emptyLabel?: string;
}) {
  if (query.isLoading) {
    return skeleton ? <>{skeleton}</> : <LoadingRows />;
  }

  if (query.error) {
    return (
      <Alert variant="danger" title="Could not load this">
        <p>{query.error}</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={query.refetch}>
          Try again
        </Button>
      </Alert>
    );
  }

  if (query.data === null || query.data === undefined) {
    return <p className="text-[13px] text-[var(--text-muted)]">{emptyLabel}</p>;
  }

  return <>{children(query.data)}</>;
}

/** Neutral placeholder that occupies roughly the space real content will. */
export function LoadingRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-xl bg-[var(--surface-sunken)]"
          aria-hidden="true"
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />
      <LoadingRows rows={4} />
    </div>
  );
}
