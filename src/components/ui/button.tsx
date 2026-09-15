import { Slot } from './slot';
import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-sm disabled:hover:bg-[var(--accent)]',
  secondary:
    'bg-[var(--surface-sunken)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]',
  outline:
    'bg-transparent text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
  danger: 'bg-[var(--danger)] text-white hover:brightness-110 shadow-sm',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
  icon: 'h-9 w-9 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Render as the child element (e.g. a Next.js <Link>) instead of a <button>. */
  asChild?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      className={cn(
        'inline-flex items-center rounded-lg font-medium whitespace-nowrap',
        'transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
