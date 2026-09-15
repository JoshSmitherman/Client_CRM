'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { PROJECT_TYPE_LABELS, toOptions } from '@/lib/constants';
import { cn } from '@/lib/utils';

export interface FilterOptions {
  clients: { id: string; company_name: string }[];
  staff: { id: string; full_name: string }[];
  stages: { key: string; label: string }[];
  plans: { id: string; name: string }[];
}

const COMPLETION_BANDS = [
  { value: '0-25', label: '0–25% complete' },
  { value: '26-50', label: '26–50% complete' },
  { value: '51-75', label: '51–75% complete' },
  { value: '76-99', label: '76–99% complete' },
  { value: '100-100', label: 'Complete' },
];

/**
 * Filters live in the URL, so a filtered view is shareable, survives a refresh
 * and works with browser back. Each change is a navigation wrapped in a
 * transition, so the page does not flicker while the server re-renders.
 */
export function FilterBar({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get('q') ?? '');

  // Debounce the free-text search so typing does not fire a request per keystroke.
  useEffect(() => {
    const current = params.get('q') ?? '';
    if (search === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search) next.set('q', search);
      else next.delete('q');
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [search, params, pathname, router]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  const activeCount = ['client', 'staff', 'stage', 'type', 'plan', 'completion', 'q'].filter((k) =>
    params.get(k),
  ).length;

  return (
    <div className={cn('mb-5 space-y-3', isPending && 'opacity-70 transition-opacity')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client or project name…"
            aria-label="Search by client or project name"
            className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] pr-3 pl-9 text-sm placeholder:text-[var(--text-muted)]"
          />
        </div>

        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Select
          aria-label="Filter by client"
          value={params.get('client') ?? ''}
          onChange={(e) => update('client', e.target.value)}
          placeholder="All clients"
          options={options.clients.map((c) => ({ value: c.id, label: c.company_name }))}
        />
        <Select
          aria-label="Filter by staff member"
          value={params.get('staff') ?? ''}
          onChange={(e) => update('staff', e.target.value)}
          placeholder="All staff"
          options={options.staff.map((s) => ({ value: s.id, label: s.full_name || 'Unnamed' }))}
        />
        <Select
          aria-label="Filter by status"
          value={params.get('stage') ?? ''}
          onChange={(e) => update('stage', e.target.value)}
          placeholder="All statuses"
          options={options.stages.map((s) => ({ value: s.key, label: s.label }))}
        />
        <Select
          aria-label="Filter by project type"
          value={params.get('type') ?? ''}
          onChange={(e) => update('type', e.target.value)}
          placeholder="All types"
          options={toOptions(PROJECT_TYPE_LABELS)}
        />
        <Select
          aria-label="Filter by maintenance tier"
          value={params.get('plan') ?? ''}
          onChange={(e) => update('plan', e.target.value)}
          placeholder="All tiers"
          options={options.plans.map((p) => ({ value: p.id, label: p.name }))}
        />
        <Select
          aria-label="Filter by completion"
          value={params.get('completion') ?? ''}
          onChange={(e) => update('completion', e.target.value)}
          placeholder="Any completion"
          options={COMPLETION_BANDS}
        />
      </div>
    </div>
  );
}
