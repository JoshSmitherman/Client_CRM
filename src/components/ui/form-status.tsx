import { useFormStatus } from 'react-dom';

import { Alert } from '@/components/ui/alert';
import { Button, type ButtonProps } from '@/components/ui/button';
import type { ActionState } from '@/lib/actions/types';

/** Submit button that disables and relabels itself while the action runs. */
export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Renders the form-level outcome of a Server Action. */
export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === 'idle' || !state.message) return null;

  return (
    <Alert variant={state.status === 'success' ? 'success' : 'danger'}>{state.message}</Alert>
  );
}
