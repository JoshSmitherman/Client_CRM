import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session as SupabaseSession } from '@supabase/supabase-js';

import { isAgency } from '@/lib/permissions';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/database.types';

export type Profile = Tables<'users'>;

export interface AuthState {
  /** null once resolved and nobody is signed in; undefined while still loading. */
  profile: Profile | null;
  userId: string | null;
  email: string | null;
  clientId: string | null;
  isLoading: boolean;
  /** Signed in, but the account is not active — pending approval, or uninvited. */
  isPending: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  /**
   * Loads the profile for a signed-in user.
   *
   * An inactive profile is deliberately not treated as "signed in": the
   * database gives it no access, so the application should not pretend
   * otherwise. It is surfaced as `isPending` so the reason can be explained.
   */
  const loadProfile = useCallback(async (currentSession: SupabaseSession | null) => {
    if (!currentSession?.user) {
      setProfile(null);
      setClientId(null);
      setIsPending(false);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentSession.user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!data || !data.is_active) {
      setProfile(null);
      setClientId(null);
      setIsPending(Boolean(data));
      setIsLoading(false);
      return;
    }

    setProfile(data);
    setIsPending(false);

    // Portal users are scoped to one client; agency users are not.
    if (!isAgency(data.role) && data.organisation_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('organisation_id', data.organisation_id)
        .is('deleted_at', null)
        .maybeSingle();
      setClientId(client?.id ?? null);
    } else {
      setClientId(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      void loadProfile(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void loadProfile(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadProfile(data.session);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setClientId(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      profile,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? profile?.email ?? null,
      clientId,
      isLoading,
      isPending,
      refresh,
      signOut,
    }),
    [profile, session, clientId, isLoading, isPending, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

/**
 * The signed-in profile, for screens already behind a route guard.
 * Throws rather than returning null so a component never has to null-check
 * something the guard has already guaranteed.
 */
export function useProfile(): Profile & { userId: string; clientId: string | null } {
  const { profile, userId, clientId } = useAuth();
  if (!profile || !userId) {
    throw new Error('useProfile used outside an authenticated route');
  }
  return { ...profile, userId, clientId };
}
