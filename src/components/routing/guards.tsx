import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { isAgency } from '@/lib/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Route guards.
 *
 * These decide what to RENDER. They are not the security boundary — Row Level
 * Security is, and it runs in Postgres. A user who edited their way past these
 * would reach screens that simply return no data.
 */

function FullPageSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-sm text-[var(--text-secondary)]" role="status">
        {label}
      </p>
    </div>
  );
}

/** Anyone signed in and active. */
export function RequireAuth() {
  const { profile, isLoading, isPending, signOut } = useAuth();
  const location = useLocation();

  if (!isSupabaseConfigured) return <Navigate to="/setup" replace />;
  if (isLoading) return <FullPageSpinner label="Loading…" />;

  // Signed in, but the account has no access yet — explain rather than
  // bouncing them silently back to a login form they just used.
  if (isPending) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <Alert variant="warning" title="Your account is not active yet">
          It is either waiting for an administrator to approve it, or it was created without an
          invitation. Contact your account manager and they can sort it out.
        </Alert>
        <Button className="mt-4" variant="secondary" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}

/** Agency staff of any role. */
export function RequireAgency() {
  const { profile, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="Loading…" />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!isAgency(profile.role)) return <Navigate to="/portal" replace />;

  return <Outlet />;
}

/** Agency administrators only. */
export function RequireAgencyAdmin() {
  const { profile, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="Loading…" />;
  if (!profile) return <Navigate to="/login" replace />;
  if (!isAgency(profile.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/** Client portal users. */
export function RequireClient() {
  const { profile, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="Loading…" />;
  if (!profile) return <Navigate to="/login" replace />;
  if (isAgency(profile.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

/** Sends a signed-in visitor to their own home page. */
export function HomeRedirect() {
  const { profile, isLoading } = useAuth();

  if (!isSupabaseConfigured) return <Navigate to="/setup" replace />;
  if (isLoading) return <FullPageSpinner label="Loading…" />;
  if (!profile) return <Navigate to="/login" replace />;

  return <Navigate to={isAgency(profile.role) ? '/dashboard' : '/portal'} replace />;
}
