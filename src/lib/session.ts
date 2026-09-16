import { isAgency } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export type Profile = Tables<'users'>;

export interface CurrentUser {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * The signed-in user, read from the Supabase session.
 *
 * Used by mutation functions that need the caller's id or role. These checks
 * are for giving a clear message, not for security: the database refuses
 * anything they would wrongly allow, so a user who bypassed this code entirely
 * would simply get an empty result or a policy violation.
 */
export async function currentUser(): Promise<CurrentUser> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('You are not signed in.');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    throw new Error('Your account is not active.');
  }

  return { userId: user.id, email: user.email ?? profile.email, profile };
}

export async function requireAgencyUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!isAgency(user.profile.role)) {
    throw new Error('Only agency users can do that.');
  }
  return user;
}

export async function requireAgencyAdminUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!isAgency(user.profile.role)) {
    throw new Error('Only an agency administrator can do that.');
  }
  return user;
}

/** The clients.id for a portal user's organisation. Null for agency users. */
export async function currentClientId(): Promise<string | null> {
  const user = await currentUser();
  if (isAgency(user.profile.role) || !user.profile.organisation_id) return null;

  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('organisation_id', user.profile.organisation_id)
    .is('deleted_at', null)
    .maybeSingle();

  return data?.id ?? null;
}

export const isAgencyRole = isAgency;

/** Where a user should land after signing in. */
export function homePathForRole(role: Profile['role']): string {
  return isAgency(role) ? '/dashboard' : '/portal';
}
