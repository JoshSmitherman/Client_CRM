import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { requireSupabaseEnv } from './env';

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * The `server-only` import above makes importing this from a Client Component
 * a build error, so the key cannot be bundled into the browser.
 *
 * Deliberately used in exactly two places:
 *   1. Inviting a user (auth.admin.inviteUserByEmail)
 *   2. The scheduled reminder sweep, which runs with no user session
 *
 * Everything else must use lib/supabase/server.ts so RLS applies.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. It is required for sending invitations. ' +
        'Set it in .env.local — never with a NEXT_PUBLIC_ prefix.',
    );
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
