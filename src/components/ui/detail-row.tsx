import type { ReactNode } from 'react';

/** Label on the left, value on the right — the shape used by every detail sidebar. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
