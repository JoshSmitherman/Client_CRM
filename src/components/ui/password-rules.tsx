import { cn } from '@/lib/utils';

/** Stated up front so requirements are never a surprise after submitting. */
export function PasswordRules({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg bg-[var(--surface-sunken)] px-4 py-3 text-[12px] text-[var(--text-secondary)]',
        className,
      )}
    >
      <p className="font-medium text-[var(--text-primary)]">Your password must</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        <li>be at least 12 characters long</li>
        <li>include an upper-case and a lower-case letter</li>
        <li>include a number</li>
      </ul>
    </div>
  );
}
