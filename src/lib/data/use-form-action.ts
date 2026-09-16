import { useActionState } from 'react';

import { idleState, type ActionState } from '@/lib/actions/types';
import { revalidate } from '@/lib/data/revalidate';
import { useActionRedirect } from '@/lib/data/use-action-redirect';

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * useActionState, plus the two things every form here needs afterwards:
 * navigate if the mutation asked for it, and re-read the screen if it did not.
 *
 * Both used to be the framework's job — redirect() and revalidatePath(). Doing
 * them in one hook rather than in each form means a new form cannot forget.
 */
export function useFormAction(action: FormAction): [ActionState, (formData: FormData) => void] {
  const [state, dispatch] = useActionState(async (prev: ActionState, formData: FormData) => {
    const next = await action(prev, formData);
    // A redirect replaces the screen, so there is nothing here worth refetching.
    if (next.status === 'success' && !next.redirectTo) revalidate();
    return next;
  }, idleState);

  useActionRedirect(state);

  return [state, dispatch];
}
