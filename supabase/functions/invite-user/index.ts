// ===========================================================================
// invite-user — issues a portal or staff login
// ===========================================================================
// This is the one operation the browser cannot do for itself. Sending an
// invitation needs the Supabase service role key, which bypasses Row Level
// Security completely; putting it in a static bundle would hand every visitor
// full read and write access to every client's data.
//
// So it lives here instead. The key is a Supabase secret, readable only by
// this function, and never leaves Supabase's infrastructure.
//
// The caller's own token is verified first, and their permission to invite is
// checked against the database as that user — not taken on trust from the
// request body.
//
// Deploy with:  npx supabase functions deploy invite-user
// Secrets:      SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the
//               platform automatically.
// ===========================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AGENCY_ROLES = [
  'agency_admin',
  'project_manager',
  'account_manager',
  'developer',
  'designer',
  'qa',
  'support_agent',
];
const CLIENT_ROLES = ['client_owner', 'client_member'];
const ALL_ROLES = [...AGENCY_ROLES, ...CLIENT_ROLES];

interface InviteBody {
  email?: string;
  fullName?: string;
  role?: string;
  clientId?: string | null;
  message?: string | null;
  redirectTo?: string;
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

  // A client carrying the caller's token. Everything read through this is
  // subject to the same Row Level Security the caller has in the application,
  // so it cannot be used to look at anything they could not already see.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  });

  const {
    data: { user },
    error: userError,
  } = await asCaller.auth.getUser();

  if (userError || !user) return json({ error: 'Not signed in.' }, 401);

  const { data: profile } = await asCaller
    .from('users')
    .select('role, organisation_id, is_active, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return json({ error: 'Your account is not active.' }, 403);
  }

  let body: InviteBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Could not read the request.' }, 400);
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const role = body.role ?? '';
  const fullName = (body.fullName ?? '').trim();

  if (!email || !email.includes('@')) return json({ error: 'Enter a valid email address.' }, 400);
  if (!ALL_ROLES.includes(role)) return json({ error: 'That role is not recognised.' }, 400);

  const isClientRole = CLIENT_ROLES.includes(role);
  const isAdmin = profile.role === 'agency_admin';
  const isClientOwner = profile.role === 'client_owner';

  // Who may invite whom. An administrator may invite anyone; a client
  // administrator may invite colleagues into their own organisation, as client
  // users only. Nobody else may invite at all.
  if (!isAdmin && !(isClientOwner && isClientRole)) {
    return json({ error: 'You do not have permission to invite people.' }, 403);
  }

  let organisationId = profile.organisation_id;

  if (isAdmin && isClientRole) {
    if (!body.clientId) {
      return json({ error: 'Choose which client this person belongs to.' }, 400);
    }
    const { data: client } = await asCaller
      .from('clients')
      .select('organisation_id')
      .eq('id', body.clientId)
      .maybeSingle();

    if (!client) return json({ error: 'That client could not be found.' }, 404);
    organisationId = client.organisation_id;
  }

  if (!organisationId) {
    return json({ error: 'Could not work out which organisation to attach them to.' }, 400);
  }

  // From here on the service role is needed: creating an auth user, and writing
  // an invitation row on behalf of someone whose own policies would allow it.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return json({ error: 'Someone with that email address already has an account.' }, 409);
  }

  const { data: invitation, error: inviteRowError } = await admin
    .from('invitations')
    .insert({
      email,
      full_name: fullName,
      role,
      organisation_id: organisationId,
      client_id: isClientRole ? (body.clientId ?? null) : null,
      invited_by: user.id,
      message: body.message ?? null,
    })
    .select('id')
    .single();

  if (inviteRowError || !invitation) {
    // The partial unique index means a live invitation already exists.
    if (inviteRowError?.code === '23505') {
      return json({ error: 'That address already has an invitation waiting.' }, 409);
    }
    return json({ error: inviteRowError?.message ?? 'Could not create the invitation.' }, 500);
  }

  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: body.redirectTo,
    data: { full_name: fullName },
  });

  if (sendError) {
    // Roll the row back, so a retry is not blocked by the unique index.
    await admin.from('invitations').delete().eq('id', invitation.id);
    return json(
      {
        error:
          `Could not send the invitation email: ${sendError.message}. ` +
          'Check the redirect URL is allowed in your Supabase auth settings.',
      },
      502,
    );
  }

  // audit_logs has no insert policy; record_audit is the only way in, and it
  // runs as the caller so the log names the right person.
  await asCaller.rpc('record_audit', {
    p_action: 'invitation.sent',
    p_entity_type: 'invitation',
    p_entity_id: invitation.id,
    p_previous_value: null,
    p_new_value: { email, role, organisation_id: organisationId },
    p_ip_address: null,
    p_user_agent: request.headers.get('user-agent'),
  });

  return json({ ok: true, invitationId: invitation.id });
});
