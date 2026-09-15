'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/supabase/env';
import { homePathForRole } from '@/lib/auth';
import { formObject } from '@/lib/validation/common';
import {
  acceptInviteSchema,
  resetRequestSchema,
  signInSchema,
  updatePasswordSchema,
} from '@/lib/validation/auth';
import { recordAudit } from '@/lib/audit';
import { errorState, successState, zodErrors, type ActionState } from './types';

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signInSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Deliberately generic: distinguishing "no such user" from "wrong password"
    // would let an attacker enumerate valid email addresses.
    return errorState('That email address and password combination was not recognised.');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return errorState('Could not start a session. Please try again.');

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return errorState(
      'Your account is not active yet. Ask your account manager to send you an invitation.',
    );
  }

  revalidatePath('/', 'layout');
  redirect(homePathForRole(profile.role));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/update-password`,
  });

  // Always report success, for the same enumeration reason as sign-in.
  return successState(
    'If that address belongs to an account, a password reset link is on its way.',
  );
}

export async function updatePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updatePasswordSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorState('Your reset link has expired. Request a new one.');

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(error.message);

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  revalidatePath('/', 'layout');
  redirect(profile ? homePathForRole(profile.role) : '/login');
}

/**
 * Completes an invitation: sets the person's name and password and activates
 * the profile that handle_new_user() created from the pending invitation.
 */
export async function acceptInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = acceptInviteSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorState('Your invitation link has expired. Ask for a new one.');

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { full_name: parsed.data.fullName },
  });
  if (passwordError) return errorState(passwordError.message);

  // is_active is guarded against self-service changes, so only set the name
  // here; the invitation trigger has already activated an invited profile.
  const { error: profileError } = await supabase
    .from('users')
    .update({ full_name: parsed.data.fullName })
    .eq('id', user.id);

  if (profileError) return errorState('Could not save your name. Please try again.');

  await recordAudit({
    action: 'invitation.accepted',
    entityType: 'user',
    entityId: user.id,
    newValue: { full_name: parsed.data.fullName },
  });

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    return errorState(
      'Your password is set, but your account has not been linked to an organisation yet. ' +
        'Contact your account manager.',
    );
  }

  revalidatePath('/', 'layout');
  redirect(homePathForRole(profile.role));
}
