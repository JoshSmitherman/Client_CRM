import { cn } from '@/lib/utils';
import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-card', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <h2 className="text-[15px] font-semibold">{title}</h2> : null}
        {description ? (
          <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{description}</p>
        ) : null}
        {children}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-3',
        className,
      )}
      {...props}
    />
  );
}
