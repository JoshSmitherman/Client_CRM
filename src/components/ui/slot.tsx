import { Children, cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * Minimal `asChild` implementation: merges props onto a single child element
 * so a Button can render a <Link> without nesting an <a> inside a <button>.
 * Hand-rolled rather than pulling in Radix for one behaviour.
 */
export function Slot({
  children,
  className,
  ...props
}: { children?: ReactNode; className?: string } & Record<string, unknown>) {
  const child = Children.only(children) as ReactElement<{ className?: string }>;

  if (!isValidElement(child)) return null;

  return cloneElement(child, {
    ...props,
    ...(child.props as object),
    className: cn(className, child.props.className),
  } as never);
}
