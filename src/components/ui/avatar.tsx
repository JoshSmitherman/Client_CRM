import { cn, initialsOf } from '@/lib/utils';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const;

/**
 * Deterministic tint from the name, so the same person is always the same
 * colour without storing one.
 */
function hueFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name?.trim() || 'Unknown';
  const hue = hueFor(label);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZES[size],
        className,
      )}
      style={{
        backgroundColor: `oklch(0.92 0.05 ${hue})`,
        color: `oklch(0.40 0.11 ${hue})`,
      }}
      title={label}
    >
      <span aria-hidden="true">{initialsOf(label)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
