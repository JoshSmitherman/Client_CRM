import { cn } from '@/lib/utils';
import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

/**
 * Tables scroll horizontally inside their own container rather than forcing the
 * page to scroll sideways on a phone.
 */
export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('scrollbar-thin w-full overflow-x-auto', className)} {...props} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse text-sm', className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-[var(--border-subtle)] px-4 py-2.5 text-left',
        'text-[12px] font-semibold tracking-wide text-[var(--text-secondary)] uppercase',
        'whitespace-nowrap',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('border-b border-[var(--border-subtle)] px-4 py-3 align-middle', className)}
      {...props}
    />
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-[var(--surface-hover)]', className)} {...props} />;
}
