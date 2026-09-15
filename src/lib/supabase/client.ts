'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './database.types';

/**
 * Browser client. Only ever uses the anon key, which is safe to expose
 * because Row Level Security decides what it can actually reach.
 * Used for auth screens and realtime; all mutations go through Server Actions.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing. See docs/SETUP.md.');
  }

  return createBrowserClient<Database>(url, anonKey);
}
