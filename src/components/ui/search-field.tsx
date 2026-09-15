'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { cn } from '@/lib/utils';

/**
 * URL-backed search box. Debounced so typing does not fire a request per key,
 * and shareable because the term lives in the query string.
 */
export function SearchField({
  label,
  placeholder,
  paramName = 'q',
  className,
}: {
  label: string;
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(params.get(paramName) ?? '');

  useEffect(() => {
    const current = params.get(paramName) ?? '';
    if (value === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(paramName, value);
      else next.delete(paramName);
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [value, params, paramName, pathname, router]);

  return (
    <div className={cn('relative', isPending && 'opacity-70', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] pr-3 pl-9 text-sm placeholder:text-[var(--text-muted)]"
      />
    </div>
  );
}
