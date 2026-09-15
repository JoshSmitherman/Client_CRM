import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Alert } from '@/components/ui/alert';
import { PasswordRules } from '@/components/ui/password-rules';
import { createClient } from '@/lib/supabase/server';
import { AcceptInviteForm } from './accept-invite-form';

export const metadata: Metadata = { title: 'Accept your invitation' };

// Depends on the session created by the invitation link.
export const dynamic = 'force-dynamic';

/**
 * Reached after the invitation link has been exchanged for a session at
 * /auth/callback. The profile row already exists — handle_new_user() created it
 * from the pending invitation — so all that remains is a name and a password.
 */
export default async function AcceptInvitePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <>
        <h1 className="text-xl font-semibold">This invitation link has expired</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Invitation links are valid for 14 days. Ask your account manager to send a new one.
        </p>
      </>
    );
  }

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, is_active, organisation_id')
    .eq('id', user.id)
    .maybeSingle();

  // An active profile means the invitation has already been used.
  if (profile?.is_active && profile.full_name) {
    redirect('/');
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Welcome — set up your account</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Signing in as <span className="font-medium text-[var(--text-primary)]">{user.email}</span>.
      </p>

      {!profile?.organisation_id ? (
        <Alert variant="warning" className="mt-4" title="No invitation found">
          Your sign-in worked, but we could not match it to an invitation, so your account has no
          access yet. Contact your account manager and they can re-issue it.
        </Alert>
      ) : null}

      <PasswordRules className="mt-4" />
      <AcceptInviteForm defaultName={profile?.full_name ?? ''} />
    </>
  );
}
