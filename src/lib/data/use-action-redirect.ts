import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ActionState } from '@/lib/actions/types';

/**
 * Navigates when a mutation asks it to.
 *
 * A Server Action could call redirect() itself; a plain async function in the
 * browser cannot, so it returns `redirectTo` and this performs the navigation.
 */
export function useActionRedirect(state: ActionState) {
  const navigate = useNavigate();

  useEffect(() => {
    if (state.status === 'success' && state.redirectTo) {
      navigate(state.redirectTo);
    }
  }, [state, navigate]);
}
