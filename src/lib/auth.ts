import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/database.types';

export type Profile = Tables<'users'>;

export interface Session {
  userId: string;
  email: string;
  profile: Profile;
}

/**
 * Resolves the signed-in user and their profile.
 *
 * Uses getUser() rather than getSession(): getUser() revalidates the token with
 * Supabase, whereas getSession() trusts the cookie, which a client can forge.
 *
 * Wrapped in React's cache() so a page rendering a dozen server components
 * resolves the session once per request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  return { userId: user.id, email: user.email ?? profile.email, profile };
});

/** Any authenticated, active user. Redirects to login otherwise. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}

/** An agency-side user of any role. */
export async function requireAgency(): Promise<Session> {
  const session = await requireUser();
  if (!isAgencyRole(session.profile.role)) redirect('/portal');
  return session;
}

/** Agency administrators only — settings, plans, team, audit log. */
export async function requireAgencyAdmin(): Promise<Session> {
  const session = await requireAgency();
  if (session.profile.role !== 'agency_admin') redirect('/dashboard');
  return session;
}

/** A client-portal user. */
export async function requireClient(): Promise<Session> {
  const session = await requireUser();
  if (isAgencyRole(session.profile.role)) redirect('/dashboard');
  return session;
}

export function isAgencyRole(role: Profile['role']): boolean {
  return role !== 'client_owner' && role !== 'client_member';
}

/**
 * The clients.id for a portal user's organisation. Returns null for agency
 * users, who are not scoped to a single client.
 */
export async function getCurrentClientId(): Promise<string | null> {
  const session = await getSession();
  if (!session || isAgencyRole(session.profile.role)) return null;
  if (!session.profile.organisation_id) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('organisation_id', session.profile.organisation_id)
    .is('deleted_at', null)
    .maybeSingle();

  return data?.id ?? null;
}

/** Where a user should land after signing in. */
export function homePathForRole(role: Profile['role']): string {
  return isAgencyRole(role) ? '/dashboard' : '/portal';
}
