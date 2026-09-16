import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Centred dialog, built on the native <dialog> element.
 *
 * Using the platform element rather than a div means the browser handles the
 * things hand-rolled modals usually get wrong: focus moves inside on open and
 * returns to the trigger on close, Tab cannot escape, Escape dismisses, and it
 * renders in the top layer so no z-index fight is possible.
 *
 * What is added here: a backdrop click closes it, the page behind does not
 * scroll, and the dialog itself scrolls when the content is taller than the
 * viewport.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Escape and the close button both fire the element's own close event, so
  // there is one path back out rather than three.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      // The dialog fills the top layer; the click target for "outside" is the
      // element itself, since the card below stops the event.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-0 text-[var(--text-primary)] shadow-[var(--shadow-raised)] backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        size === 'lg' ? 'max-w-3xl' : 'max-w-xl',
      )}
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4">
          <div className="min-w-0">
            <h2 id="modal-title" className="text-[15px] font-semibold">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{description}</p>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label="Close"
            onClick={() => ref.current?.close()}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
