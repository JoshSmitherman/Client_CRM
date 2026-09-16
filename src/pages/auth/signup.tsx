import { Link } from 'react-router-dom';

import { SignUpForm } from '@/components/auth/signup-form';
import { QueryBoundary } from '@/components/routing/page-state';
import { Alert } from '@/components/ui/alert';
import { PasswordRules } from '@/components/ui/password-rules';
import { useQuery } from '@/lib/data/use-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { useDocumentTitle } from '@/lib/use-document-title';

interface SignupHints {
  mode: string;
  domains: string[];
  isFirstAccount: boolean;
}

const FALLBACK: SignupHints = { mode: 'approval_required', domains: [], isFirstAccount: false };

/**
 * Read through a SECURITY DEFINER function rather than agency_settings: this
 * screen is public, and that table is readable by signed-in users only.
 */
async function loadHints(): Promise<SignupHints> {
  if (!isSupabaseConfigured) return FALLBACK;

  const { data, error } = await supabase.rpc('staff_signup_hints').maybeSingle();
  if (error || !data) return FALLBACK;

  return {
    mode: data.signup_mode ?? 'approval_required',
    domains: data.email_domains ?? [],
    isFirstAccount: Boolean(data.is_first_account),
  };
}

export function SignUpPage() {
  useDocumentTitle('Create a staff account');
  const query = useQuery(loadHints, []);

  return (
    <QueryBoundary
      query={query}
      skeleton={<div className="h-64 animate-pulse rounded-xl bg-[var(--surface-sunken)]" />}
    >
      {({ mode, domains, isFirstAccount }) => (
        <>
          <h1 className="text-xl font-semibold">
            {isFirstAccount ? 'Set up your agency' : 'Create a staff account'}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isFirstAccount
              ? 'You are the first person here, so this account becomes the administrator.'
              : 'For agency staff. Clients are given access by their account manager.'}
          </p>

          {isFirstAccount ? (
            <Alert variant="info" className="mt-4" title="This happens once">
              The first account created becomes the agency administrator. Everyone after you
              either needs an invitation or an email address on an approved domain.
            </Alert>
          ) : mode === 'disabled' ? (
            <Alert variant="warning" className="mt-4" title="Self-registration is turned off">
              Ask an administrator to send you an invitation.
            </Alert>
          ) : domains.length > 0 ? (
            <Alert variant="info" className="mt-4">
              Use your work email address{' '}
              {domains.length === 1 ? (
                <>
                  at <span className="font-medium">{domains[0]}</span>
                </>
              ) : (
                <>
                  at one of: <span className="font-medium">{domains.join(', ')}</span>
                </>
              )}
              .{' '}
              {mode === 'approval_required'
                ? 'An administrator will approve your account before you can sign in.'
                : 'You will be able to sign in straight away.'}
            </Alert>
          ) : (
            <Alert variant="warning" className="mt-4" title="No approved domains yet">
              An administrator needs to add your email domain in Settings, or send you an
              invitation.
            </Alert>
          )}

          <PasswordRules className="mt-4" />
          <SignUpForm />

          <p className="mt-6 text-[13px]">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[var(--accent-text)] hover:underline">
              Sign in
            </Link>
          </p>
        </>
      )}
    </QueryBoundary>
  );
}
