import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTransition } from 'react';

import { cn } from '@/lib/utils';

const TOGGLES = [
  { key: 'mine', value: '1', label: 'Assigned to me' },
  { key: 'overdue', value: '1', label: 'Overdue' },
  { key: 'responsibility', value: 'client', label: 'Client actions' },
  { key: 'responsibility', value: 'agency', label: 'Agency actions' },
];

/** Toggle chips that read and write the URL, so a view can be bookmarked. */
export function TaskFilters() {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [params] = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function toggle(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);

    startTransition(() => {
      navigate(`${pathname}?${next.toString()}`, { replace: true });
    });
  }

  return (
    <div className={cn('mb-4 flex flex-wrap gap-2', isPending && 'opacity-70')}>
      {TOGGLES.map((t) => {
        const active = params.get(t.key) === t.value;
        return (
          <button
            key={`${t.key}-${t.value}`}
            type="button"
            onClick={() => toggle(t.key, t.value)}
            aria-pressed={active}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
              active
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                : 'border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]',
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
