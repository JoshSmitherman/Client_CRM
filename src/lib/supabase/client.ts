import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

/**
 * The single Supabase client for the whole application.
 *
 * It carries the anon key, which is compiled into the browser bundle. That is
 * how Supabase is designed to be used: the key grants no access on its own, and
 * every read and write is evaluated against Row Level Security using the
 * signed-in user's token. A signed-out visitor holding this key can reach
 * nothing.
 *
 * The service role key — which does bypass Row Level Security — never appears
 * in this codebase. Issuing client logins is the one operation that needs it,
 * and that runs in a Supabase Edge Function.
 */
/**
 * Trimmed, and empty treated as missing. A secret that exists but is blank is
 * an easy mistake to make, and createClient() throws on an empty URL — which
 * would take the whole application down at import time rather than showing the
 * setup screen that exists to explain the problem.
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim() || undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Placeholders keep the module importable when nothing is configured, so the
// setup screen can render and say so.
export const supabase = createSupabaseClient<Database>(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Absolute URL of this deployment, used to build invitation and reset links. */
export function siteUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${window.location.origin}${base.endsWith('/') ? base.slice(0, -1) : base}`;
}
