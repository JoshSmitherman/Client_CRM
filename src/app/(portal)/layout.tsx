import { AppShell } from '@/components/layout/app-shell';
import { CLIENT_MOBILE_NAV, CLIENT_NAV } from '@/components/layout/navigation';
import { requireClient } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/permissions';
import { getClientBadges } from '@/lib/queries/badges';
import { createClient } from '@/lib/supabase/server';

// Every portal page is specific to the signed-in client and must never be cached.
export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireClient();
  const supabase = await createClient();

  const [badges, { data: organisation }] = await Promise.all([
    getClientBadges(),
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
      nav={CLIENT_NAV}
      mobileNav={CLIENT_MOBILE_NAV}
      badges={badges}
      isAdmin={false}
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
