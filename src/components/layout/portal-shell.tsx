import { Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { AppShell } from './app-shell';
import { CLIENT_MOBILE_NAV, CLIENT_NAV } from './navigation';
import { useProfile } from '@/lib/auth-context';
import { ROLE_LABELS } from '@/lib/permissions';
import { getClientBadges } from '@/lib/queries/badges';
import { supabase } from '@/lib/supabase/client';

export function PortalShell() {
  const profile = useProfile();
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [organisation, setOrganisation] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getClientBadges().then((result) => {
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
      nav={CLIENT_NAV}
      mobileNav={CLIENT_MOBILE_NAV}
      badges={badges}
      isAdmin={false}
      user={{
        name: profile.full_name || profile.email,
        email: profile.email,
        roleLabel: ROLE_LABELS[profile.role],
        organisation,
        accountHref: '/portal/account',
      }}
    >
      <Outlet />
    </AppShell>
  );
}
