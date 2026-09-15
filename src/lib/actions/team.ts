'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { AuditAction, recordAudit } from '@/lib/audit';
import { requireUser } from '@/lib/auth';
import { canInviteColleagues, isAgencyAdmin } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
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
  const session = await requireUser();

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

  const supabase = await createClient();
  let organisationId = session.profile.organisation_id;

  if (isAgencyAdmin(session.profile.role)) {
    if (isClientUser) {
      if (!input.clientId) {
        return errorState('Choose which client this person belongs to.', {
          clientId: 'Required for a client account.',
        });
      }
      const { data: client } = await supabase
        .from('clients')
        .select('organisation_id')
        .eq('id', input.clientId)
        .maybeSingle();

      if (!client) return errorState('That client could not be found.');
      organisationId = client.organisation_id;
    }
    // Agency invitations keep the inviter's own (agency) organisation.
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

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      email: input.email,
      full_name: input.fullName ?? '',
      role: input.role,
      organisation_id: organisationId,
      client_id: isClientUser ? (input.clientId ?? null) : null,
      invited_by: session.userId,
      message: input.message ?? null,
    })
    .select('id, token')
    .single();

  if (error || !invitation) {
    // The partial unique index means a live invitation already exists.
    if (error?.code === '23505') {
      return errorState('That address already has an invitation waiting.', {
        email: 'An invitation is already outstanding for this address.',
      });
    }
    return errorState(`Could not create the invitation: ${error?.message ?? 'unknown error'}`);
  }

  // Service role is needed to send the email; this is one of only two places
  // it is used, and it never reaches the browser.
  try {
    const admin = createAdminClient();
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(input.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/invite/accept`,
      data: { full_name: input.fullName ?? '' },
    });

    if (inviteError) {
      // Roll the row back so a retry is not blocked by the unique index.
      await supabase.from('invitations').delete().eq('id', invitation.id);
      return errorState(
        `Could not send the invitation email: ${inviteError.message}. ` +
          'Check that the redirect URL is allowed in your Supabase auth settings.',
      );
    }
  } catch (e) {
    await supabase.from('invitations').delete().eq('id', invitation.id);
    return errorState(
      e instanceof Error
        ? e.message
        : 'Could not send the invitation. Is SUPABASE_SERVICE_ROLE_KEY set?',
    );
  }

  await recordAudit({
    action: AuditAction.InvitationSent,
    entityType: 'invitation',
    entityId: invitation.id,
    newValue: { email: input.email, role: input.role, organisation_id: organisationId },
  });

  revalidatePath('/', 'layout');
  return successState(`Invitation sent to ${input.email}.`);
}

export async function revokeInvitationAction(invitationId: string): Promise<void> {
  const session = await requireUser();
  if (!canInviteColleagues(session.profile.role)) {
    throw new Error('You do not have permission to revoke invitations.');
  }

  const supabase = await createClient();

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

  revalidatePath('/', 'layout');
}

/** Deactivating keeps the person's history; it does not delete anything. */
export async function setUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const session = await requireUser();
  if (!isAgencyAdmin(session.profile.role)) {
    throw new Error('Only an administrator can change account access.');
  }

  if (userId === session.userId) {
    throw new Error('You cannot deactivate your own account.');
  }

  const supabase = await createClient();

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

  revalidatePath('/', 'layout');
}

export async function setUserRoleAction(userId: string, role: string): Promise<void> {
  const session = await requireUser();
  if (!isAgencyAdmin(session.profile.role)) {
    throw new Error('Only an administrator can change roles.');
  }

  if (userId === session.userId) {
    throw new Error('You cannot change your own role.');
  }

  const supabase = await createClient();

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

  revalidatePath('/', 'layout');
}
