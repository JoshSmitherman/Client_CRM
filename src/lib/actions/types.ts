/**
 * Every Server Action returns this shape, so forms can render field-level
 * validation errors without throwing and without a client-side schema copy.
 */
export interface ActionState {
  status: 'idle' | 'success' | 'error';
  message?: string;
  /** Field name → first error message. */
  errors?: Record<string, string>;
  /**
   * Where the caller should navigate on success.
   *
   * A mutation cannot redirect on its own in the browser, so it says where to
   * go and the form does it — see useActionRedirect.
   */
  redirectTo?: string;
}

export const idleState: ActionState = { status: 'idle' };

export function errorState(message: string, errors?: Record<string, string>): ActionState {
  return { status: 'error', message, errors };
}

export function successState(message?: string, redirectTo?: string): ActionState {
  return { status: 'success', message, redirectTo };
}

/** Flattens a zod error into the `errors` map above. */
export function zodErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
