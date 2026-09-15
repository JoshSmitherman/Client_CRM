import { AppShell } from '@/components/layout/app-shell';
import { AGENCY_MOBILE_NAV, AGENCY_NAV } from '@/components/layout/navigation';
import { requireAgency } from '@/lib/auth';
import { getAgencyBadges } from '@/lib/queries/badges';
import { ROLE_LABELS } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

// Every page here is user-specific and must never be cached.
export const dynamic = 'force-dynamic';

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAgency();
  const supabase = await createClient();

  const [badges, { data: organisation }] = await Promise.all([
    getAgencyBadges(),
    session.profile.organisation_id
      ? supabase
          .from('organisations')
          .select('name')
          .eq('id', session.profile.organisation_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <AppShell
      nav={AGENCY_NAV}
      mobileNav={AGENCY_MOBILE_NAV}
      badges={badges}
      isAdmin={session.profile.role === 'agency_admin'}
      user={{
        name: session.profile.full_name || session.email,
        email: session.email,
        roleLabel: ROLE_LABELS[session.profile.role],
        organisation: organisation?.name ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
