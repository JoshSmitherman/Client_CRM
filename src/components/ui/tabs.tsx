import { Link } from 'react-router-dom';
import { useLocation, useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/utils';

export interface TabItem {
  href: string;
  label: string;
  count?: number;
}

/**
 * Link-based tabs: each tab is a real URL, so tab state survives refresh,
 * is shareable, and works without JavaScript.
 */
export function Tabs({ items, className }: { items: TabItem[]; className?: string }) {
  const pathname = useLocation().pathname;
  const [search] = useSearchParams();
  const current = search.toString() ? `${pathname}?${search}` : pathname;

  /**
   * The longest matching href wins.
   *
   * An index tab's href is a prefix of every sibling's — /projects/:id is a
   * prefix of /projects/:id/planning — so a plain "starts with" test lights up
   * Overview on every tab. Taking the longest match picks Planning there, and
   * still picks Content on /projects/:id/content/:pageId, where there is no
   * tab for the exact path.
   */
  const activeHref = items
    .filter((item) => current === item.href || current.startsWith(`${item.href}/`))
    .reduce<string | null>(
      (best, item) => (best === null || item.href.length > best.length ? item.href : best),
      null,
    );

  return (
    <nav
      className={cn(
        'scrollbar-thin -mb-px flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]',
        className,
      )}
      aria-label="Section"
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'border-[var(--accent)] text-[var(--accent-text)]'
                : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
            )}
          >
            {item.label}
            {item.count !== undefined && item.count > 0 ? (
              <span className="rounded-full bg-[var(--surface-sunken)] px-1.5 text-[11px] font-semibold tabular-nums">
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
