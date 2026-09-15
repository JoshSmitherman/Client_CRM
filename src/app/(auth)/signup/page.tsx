import type { Metadata } from 'next';
import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { PasswordRules } from '@/components/ui/password-rules';
import { SignUpForm } from './signup-form';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const metadata: Metadata = { title: 'Create a staff account' };

// Reads the signup mode at request time.
export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  let mode = 'approval_required';
  let domains: string[] = [];
  let isFirstAccount = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    const [{ data: settings }, { count }] = await Promise.all([
      supabase
        .from('agency_settings')
        .select('staff_signup_mode, staff_email_domains')
        .maybeSingle(),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'agency_admin')
        .eq('is_active', true),
    ]);

    mode = settings?.staff_signup_mode ?? 'approval_required';
    domains = settings?.staff_email_domains ?? [];
    // An empty agency means nobody has set this up yet.
    isFirstAccount = (count ?? 0) === 0;
  }

  return (
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
          The first account created becomes the agency administrator. Everyone after you either
          needs an invitation or an email address on an approved domain.
        </Alert>
      ) : mode === 'disabled' ? (
        <Alert variant="warning" className="mt-4" title="Self-registration is turned off">
          Ask an administrator to send you an invitation.
        </Alert>
      ) : domains.length > 0 ? (
        <Alert variant="info" className="mt-4">
          Use your work email address{' '}
          {domains.length === 1 ? (
            <>at <span className="font-medium">{domains[0]}</span></>
          ) : (
            <>
              at one of:{' '}
              <span className="font-medium">{domains.join(', ')}</span>
            </>
          )}
          .{' '}
          {mode === 'approval_required'
            ? 'An administrator will approve your account before you can sign in.'
            : 'You will be able to sign in straight away.'}
        </Alert>
      ) : (
        <Alert variant="warning" className="mt-4" title="No approved domains yet">
          An administrator needs to add your email domain in Settings, or send you an invitation.
        </Alert>
      )}

      <PasswordRules className="mt-4" />
      <SignUpForm />

      <p className="mt-6 text-[13px]">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-[var(--accent-text)] hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
