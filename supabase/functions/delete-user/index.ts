// ===========================================================================
// delete-user — permanently removes a login
// ===========================================================================
// The second operation the browser cannot do for itself. Deleting somebody's
// authentication record needs the service role key, for the same reason
// inviting does: that key bypasses Row Level Security completely and must
// never reach a bundle anyone can read.
//
// Deactivating an account does NOT need this function — an administrator can
// set is_active to false directly, the guard trigger allows it, and the person
// simply stops being able to sign in. That is the reversible option and the
// one the interface offers first.
//
// This is the irreversible one. It exists because deactivating leaves the
// email address occupied: handle_new_user() only fires on a fresh auth.users
// insert, so the same address can never be invited again while the old record
// survives.
//
// What it costs, stated plainly because the interface has to say it too:
// public.users.id references auth.users on delete cascade, and 49 columns
// across the schema reference public.users on delete set null. So removing the
// authentication record also removes the profile, and every "created by",
// "uploaded by" and "approved by" pointing at them becomes null. The audit and
// activity trail survives regardless — activity_logs.actor_name and
// audit_logs.actor_email hold the name as text, not as a reference — which is
// why the record of what happened outlives the account it happened under.
//
// Deploy with:  npx supabase functions deploy delete-user
// Secrets:      SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the
//               platform automatically.
// ===========================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteBody {
  userId?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'The function is not configured correctly.' }, 500);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Not signed in.' }, 401);

  // Carries the caller's own token, so every read below is subject to the same
  // Row Level Security they have in the application.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const {
    data: { user },
    error: authError,
  } = await asCaller.auth.getUser();

  if (authError || !user) return json({ error: 'Not signed in.' }, 401);

  const { data: caller } = await asCaller
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!caller || !caller.is_active) {
    return json({ error: 'Your account is not active.' }, 403);
  }

  // Deliberately narrower than invitations, which a client administrator may
  // also send. Destroying an account is an agency administrator's job only.
  if (caller.role !== 'agency_admin') {
    return json({ error: 'Only an agency administrator can delete an account.' }, 403);
  }

  let body: DeleteBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read the request.' }, 400);
  }

  const userId = body.userId?.trim();
  if (!userId) return json({ error: 'Which account?' }, 400);

  if (userId === user.id) {
    return json({ error: 'You cannot delete your own account.' }, 400);
  }

  // Read the target as the caller. An id they cannot see is simply not found,
  // so this cannot be used to probe for accounts outside their reach.
  const { data: target } = await asCaller
    .from('users')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (!target) return json({ error: 'That account could not be found.' }, 404);

  // Record what is about to happen before it happens. The audit row stores the
  // email as text, so it still names the person after the account is gone.
  await asCaller.rpc('record_audit', {
    p_action: 'user.deleted',
    p_entity_type: 'user',
    p_entity_id: userId,
    p_previous_value: {
      email: target.email,
      full_name: target.full_name,
      role: target.role,
    },
    p_new_value: null,
  });

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return json({ error: `Could not delete the account: ${deleteError.message}` }, 500);
  }

  // public.users goes with it through the cascade, and any outstanding
  // invitation for the address is cleared so it can be issued again.
  await admin
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('email', target.email)
    .is('accepted_at', null)
    .is('revoked_at', null);

  return json({ ok: true, email: target.email });
});
