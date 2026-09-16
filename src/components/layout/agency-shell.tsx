import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { AppShell } from './app-shell';
import { AGENCY_MOBILE_NAV, AGENCY_NAV } from './navigation';
import { useProfile } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/permissions';
import { getAgencyBadges } from '@/lib/queries/badges';
import { supabase } from '@/lib/supabase/client';

export function AgencyShell() {
  const profile = useProfile();
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [organisation, setOrganisation] = useState<string | null>(null);

  // Badge counts are a nicety, not part of the first paint — the shell renders
  // immediately and the numbers appear when they arrive.
  useEffect(() => {
    let active = true;

    void getAgencyBadges().then((result) => {
      if (active) setBadges(result);
    });

    if (profile.organisation_id) {
      void supabase
        .from('organisations')
        .select('name')
        .eq('id', profile.organisation_id)
        .maybeSingle()
        .then(({ data }) => {
          if (active) setOrganisation(data?.name ?? null);
        });
    }

    return () => {
      active = false;
    };
  }, [profile.organisation_id]);

  return (
    <AppShell
      nav={AGENCY_NAV}
      mobileNav={AGENCY_MOBILE_NAV}
      badges={badges}
      isAdmin={profile.role === 'agency_admin'}
      user={{
        name: profile.full_name || profile.email,
        email: profile.email,
        roleLabel: ROLE_LABELS[profile.role],
        organisation,
        accountHref: '/settings/account',
      }}
    >
      <Outlet />
    </AppShell>
  );
}
