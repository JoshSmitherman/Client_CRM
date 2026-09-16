import { Navigate } from 'react-router-dom';

import { AcceptInviteForm } from '@/components/auth/accept-invite-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { Alert } from '@/components/ui/alert';
import { PasswordRules } from '@/components/ui/password-rules';
import { useQuery } from '@/lib/data/use-query';
import { supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

interface InviteState {
  email: string | null;
  fullName: string;
  isActive: boolean;
  hasOrganisation: boolean;
}

/**
 * Reached once the invitation link has been exchanged for a session. The
 * profile row already exists — handle_new_user() created it from the pending
 * invitation — so all that remains is a name and a password.
 */
async function loadInvite(): Promise<InviteState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { email: null, fullName: '', isActive: false, hasOrganisation: false };

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, is_active, organisation_id')
    .eq('id', user.id)
    .maybeSingle();

  return {
    email: user.email ?? null,
    fullName: profile?.full_name ?? '',
    isActive: Boolean(profile?.is_active),
    hasOrganisation: Boolean(profile?.organisation_id),
  };
}

export function AcceptInvitePage() {
  useDocumentTitle('Accept your invitation');
  const query = useQuery(loadInvite, []);

  return (
    <QueryBoundary
      query={query}
      skeleton={<div className="h-64 animate-pulse rounded-xl bg-[var(--surface-sunken)]" />}
    >
      {(invite) => {
        if (!invite.email) {
          return (
            <>
              <h1 className="text-xl font-semibold">This invitation link has expired</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Invitation links are valid for 14 days. Ask your account manager to send a new
                one.
              </p>
            </>
          );
        }

        // An active profile with a name means the invitation has already been used.
        if (invite.isActive && invite.fullName) return <Navigate to="/" replace />;

        return (
          <>
            <h1 className="text-xl font-semibold">Welcome — set up your account</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Signing in as{' '}
              <span className="font-medium text-[var(--text-primary)]">{invite.email}</span>.
            </p>

            {!invite.hasOrganisation ? (
              <Alert variant="warning" className="mt-4" title="No invitation found">
                Your sign-in worked, but we could not match it to an invitation, so your account
                has no access yet. Contact your account manager and they can re-issue it.
              </Alert>
            ) : null}

            <PasswordRules className="mt-4" />
            <AcceptInviteForm defaultName={invite.fullName} />
          </>
        );
      }}
    </QueryBoundary>
  );
}
