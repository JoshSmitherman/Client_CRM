import { useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

const CONTROL_BASE = cn(
  'w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)]',
  'px-3 py-2 text-sm text-[var(--text-primary)]',
  'transition-colors placeholder:text-[var(--text-muted)]',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-[invalid=true]:border-[var(--danger)]',
);

/**
 * Wraps a control with its label, hint and error text, wiring up `id`,
 * `aria-describedby` and `aria-invalid` so screen readers announce validation
 * failures rather than only showing them visually.
 */
export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-[var(--text-primary)]">
        {label}
        {required ? (
          <span className="ml-0.5 text-[var(--danger)]" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {hint ? (
        <p id={hintId} className="text-[12px] text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[12px] font-medium text-[var(--danger-text)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_BASE, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL_BASE, 'min-h-24 resize-y', className)} {...props} />;
}

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  options,
  placeholder,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly SelectOption[];
  placeholder?: string;
}) {
  return (
    <select className={cn(CONTROL_BASE, 'h-10 pr-8', className)} {...props}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  const inputId = props.id ?? id;

  return (
    <div className={cn('flex gap-2.5', className)}>
      <input
        type="checkbox"
        id={inputId}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border-strong)] accent-[var(--accent)]"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={inputId} className="block text-sm text-[var(--text-primary)]">
          {label}
        </label>
        {description ? (
          <p className="text-[12px] text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
