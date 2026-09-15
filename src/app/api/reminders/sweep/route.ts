import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Scheduled maintenance sweep.
 *
 * Moves active subscriptions into renewal_due inside the 30-day window,
 * expires lapsed ones that do not auto-renew, and surfaces reminders that have
 * reached their earliest notification offset.
 *
 * Idempotent, so running it more often than necessary is harmless.
 *
 * Runs with no user session, which is the one legitimate use of the service
 * role client besides sending invitations. Protected by a shared secret rather
 * than a session, since a cron job has neither.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REMINDER_SWEEP_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'REMINDER_SWEEP_SECRET is not configured on the server.' },
      { status: 500 },
    );
  }

  const authorisation = request.headers.get('authorization');
  // Vercel Cron sends the project's CRON_SECRET in the same header shape.
  if (authorisation !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('sweep_maintenance_state');

  if (error) {
    console.error('[reminders] sweep failed', error.message);
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...(typeof data === 'object' ? data : {}) });
}

/** GET is allowed so the endpoint can be checked from a browser. */
export async function GET(request: NextRequest) {
  return POST(request);
}
