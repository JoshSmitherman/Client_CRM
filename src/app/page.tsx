import { redirect } from 'next/navigation';

import { getSession, homePathForRole } from '@/lib/auth';

// Per-user routing decision: must never be cached or prerendered.
export const dynamic = 'force-dynamic';

/**
 * Entry point. Middleware handles the common cases; this covers a direct hit
 * and keeps the routing rule in one obvious place.
 */
export default async function RootPage() {
  const session = await getSession();
  redirect(session ? homePathForRole(session.profile.role) : '/login');
}
