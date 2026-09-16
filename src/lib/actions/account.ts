
import { currentUser } from '@/lib/session';
import { supabase } from '@/lib/supabase/client';
import { updatePasswordSchema } from '@/lib/validation/auth';
import { formObject, optionalText, requiredText } from '@/lib/validation/common';
import { errorState, successState, zodErrors, type ActionState } from './types';
import { z } from 'zod';

const profileSchema = z.object({
  fullName: requiredText('Your name', 120),
  jobTitle: optionalText(120),
  phone: optionalText(40),
});

/**
 * Self-service profile edit.
 *
 * Only these three columns are sent: role, organisation and active status are
 * blocked by guard_user_privileges() regardless, so an attempt to include them
 * fails loudly rather than quietly succeeding in part.
 */
export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();

  const parsed = profileSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const { error } = await supabase
    .from('users')
    .update({
      full_name: parsed.data.fullName,
      job_title: parsed.data.jobTitle ?? null,
      phone: parsed.data.phone ?? null,
    })
    .eq('id', session.userId);

  if (error) return errorState(`Could not save your details: ${error.message}`);
  return successState('Your details have been saved.');
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await currentUser();

  const parsed = updatePasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return errorState(error.message);

  return successState('Your password has been changed.');
}
