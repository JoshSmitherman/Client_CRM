import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const STYLES = {
  info: {
    wrap: 'bg-[var(--info-soft)] text-[var(--info-text)] border-[var(--info)]/25',
    Icon: Info,
  },
  success: {
    wrap: 'bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/25',
    Icon: CheckCircle2,
  },
  warning: {
    wrap: 'bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/25',
    Icon: AlertTriangle,
  },
  danger: {
    wrap: 'bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/25',
    Icon: ShieldAlert,
  },
} as const;

export function Alert({
  variant = 'info',
  title,
  children,
  className,
}: {
  variant?: keyof typeof STYLES;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { wrap, Icon } = STYLES[variant];

  return (
    <div
      className={cn('flex gap-3 rounded-lg border px-4 py-3 text-[13px]', wrap, className)}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
      </div>
    </div>
  );
}
