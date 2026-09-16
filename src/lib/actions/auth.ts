import { homePathForRole } from '@/lib/session';
import { supabase, siteUrl } from '@/lib/supabase/client';
import { formObject } from '@/lib/validation/common';
import {
  acceptInviteSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
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
      'Your account is not active yet. It may be waiting for an administrator to approve it, ' +
        'or you may need an invitation.',
    );
  }

  return successState(undefined, homePathForRole(profile.role));
}

export async function signOutAction(): Promise<void> {
  await supabase.auth.signOut();
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/update-password`,
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

  return successState('Password updated.', profile ? homePathForRole(profile.role) : '/login');
}

/**
 * Staff self-registration.
 *
 * What the new account can do is decided by handle_new_user() in the database,
 * not here: an invitation wins, then the first-ever account becomes the
 * administrator, then an allow-listed email domain becomes staff, and anything
 * else gets a profile with no organisation that can read nothing.
 *
 * Keeping that in the trigger means the rules hold however an account is
 * created — including directly through the Supabase dashboard.
 */
export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl()}/`,
    },
  });

  if (error) return errorState(error.message);

  // Supabase returns a user with no identities when the address is already
  // registered, rather than saying so — which is right, since telling a
  // stranger would confirm the address exists.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return successState(
      'Check your email. If that address can be registered, a confirmation link is on its way.',
    );
  }

  if (!data.session) {
    return successState(
      'Almost there — check your email and click the confirmation link to activate your account.',
    );
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', data.user?.id ?? '')
    .maybeSingle();

  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return successState(
      'Your account has been created and is waiting for an administrator to approve it. ' +
        'You will be able to sign in once they do.',
    );
  }

  return successState(undefined, homePathForRole(profile.role));
}

/** Completes an invitation: sets the person's name and password. */
export async function acceptInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = acceptInviteSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorState('Your invitation link has expired. Ask for a new one.');

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
    data: { full_name: parsed.data.fullName },
  });
  if (passwordError) return errorState(passwordError.message);

  // is_active is guarded against self-service changes, so only the name is set
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

  return successState(undefined, homePathForRole(profile.role));
}
