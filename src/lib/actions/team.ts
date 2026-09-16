import { z } from 'zod';

import { AuditAction, recordAudit } from '@/lib/audit';
import { canInviteColleagues, isAgencyAdmin } from '@/lib/permissions';
import { currentUser } from '@/lib/session';

import { siteUrl, supabase } from '@/lib/supabase/client';
import { email, formObject, optionalText, optionalUuid } from '@/lib/validation/common';
import { errorState, successState, zodErrors, type ActionState } from './types';

const inviteSchema = z.object({
  email,
  fullName: optionalText(120),
  role: z.enum([
    'agency_admin',
    'project_manager',
    'account_manager',
    'developer',
    'designer',
    'qa',
    'support_agent',
    'client_owner',
    'client_member',
  ]),
  clientId: optionalUuid,
  message: optionalText(1000),
});

/**
 * The only route to an account — there is no public signup.
 *
 * Writes the invitation row first, then sends the email. handle_new_user()
 * consumes the row when the person signs up, which is what attaches them to
 * the right organisation with the right role. Without a matching row a signup
 * produces an inactive profile that can see nothing.
 */
export async function sendInvitationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await currentUser();

  if (!canInviteColleagues(session.profile.role)) {
    return errorState('You do not have permission to invite people.');
  }

  const parsed = inviteSchema.safeParse(formObject(formData));
  if (!parsed.success) {
    return errorState('Check the details below.', zodErrors(parsed.error));
  }

  const input = parsed.data;
  const isClientUser = input.role === 'client_owner' || input.role === 'client_member';

  // A client administrator may only invite colleagues into their own
  // organisation, and only as client users. The policy enforces this too.
  if (!isAgencyAdmin(session.profile.role) && !isClientUser) {
    return errorState('You can only invite colleagues to your own organisation.');
  }
  // Which organisation the invitee joins is resolved by the Edge Function, as
  // the caller, so it cannot be steered from here. This check exists only to
  // fail fast with a field-level message instead of a round trip.
  if (isAgencyAdmin(session.profile.role) && isClientUser && !input.clientId) {
    return errorState('Choose which client this person belongs to.', {
      clientId: 'Required for a client account.',
    });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', input.email)
    .maybeSingle();

  if (existing) {
    return errorState('Someone with that email address already has an account.', {
      email: 'This address is already in use.',
    });
  }

  // Sending an invitation needs the service role key, which must never be in
  // a browser bundle. The Edge Function holds it, re-checks the caller's
  // permission against the database, writes the invitation row and sends the
  // email — rolling the row back itself if the send fails.
  const { data: result, error: functionError } = await supabase.functions.invoke('invite-user', {
    body: {
      email: input.email,
      fullName: input.fullName ?? '',
      role: input.role,
      clientId: isClientUser ? (input.clientId ?? null) : null,
      message: input.message ?? null,
      redirectTo: `${siteUrl()}/invite/accept`,
    },
  });

  if (functionError) {
    // The function returns a readable message in the body; surface that rather
    // than "Edge Function returned a non-2xx status code".
    let message = functionError.message;
    try {
      const body = await (functionError as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      // Body was not JSON; the generic message will have to do.
    }

    if (/already has an account/i.test(message)) {
      return errorState(message, { email: 'This address is already in use.' });
    }
    if (/invitation waiting/i.test(message)) {
      return errorState(message, { email: 'An invitation is already outstanding.' });
    }
    return errorState(message);
  }

  if (!result?.ok) {
    return errorState(result?.error ?? 'Could not send the invitation.');
  }

  // The Edge Function records the audit entry, as the caller, so the log names
  // the right person rather than the service role.
  return successState(`Invitation sent to ${input.email}.`);
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const session = await currentUser();
  if (!canInviteColleagues(session.profile.role)) {
    throw new Error('You do not have permission to revoke invitations.');
  }

  const { data: invitation } = await supabase
    .from('invitations')
    .select('email')
    .eq('id', invitationId)
    .maybeSingle();

  await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId);

  await recordAudit({
    action: AuditAction.InvitationRevoked,
    entityType: 'invitation',
    entityId: invitationId,
    previousValue: { email: invitation?.email ?? null },
  });
}

/** Deactivating keeps the person's history; it does not delete anything. */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const session = await currentUser();
  if (!isAgencyAdmin(session.profile.role)) {
    throw new Error('Only an administrator can change account access.');
  }

  if (userId === session.userId) {
    throw new Error('You cannot deactivate your own account.');
  }

  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await recordAudit({
    action: AuditAction.PermissionsChanged,
    entityType: 'user',
    entityId: userId,
    newValue: { is_active: isActive },
  });
}

export async function setUserRoleAction(userId: string, role: string): Promise<void> {
  const session = await currentUser();
  if (!isAgencyAdmin(session.profile.role)) {
    throw new Error('Only an administrator can change roles.');
  }

  if (userId === session.userId) {
    throw new Error('You cannot change your own role.');
  }

  const { data: before } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const { error } = await supabase
    .from('users')
    .update({ role: role as never })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  await recordAudit({
    action: AuditAction.PermissionsChanged,
    entityType: 'user',
    entityId: userId,
    previousValue: { role: before?.role ?? null },
    newValue: { role },
  });
}
