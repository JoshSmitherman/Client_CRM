import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session cookie on every request and performs a coarse
 * route guard.
 *
 * This is a convenience layer, not the security boundary: it keeps signed-out
 * users off application pages and saves a wasted render. Every page and Server
 * Action re-checks the session, and Row Level Security is what actually
 * protects the data.
 */

const PUBLIC_PATHS = [
  '/login',
  '/reset-password',
  '/update-password',
  '/invite',
  '/auth/callback',
  '/setup',
];

const AGENCY_PREFIXES = [
  '/dashboard',
  '/clients',
  '/projects',
  '/change-requests',
  '/support',
  '/maintenance',
  '/tasks',
  '/files',
  '/notifications',
  '/settings',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without configuration there is nothing to guard; /setup explains what to do.
  if (!url || !anonKey) {
    if (pathname === '/setup') return NextResponse.next();
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token with Supabase rather than trusting the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const redirectUrl = new URL('/login', request.url);
    if (pathname !== '/') redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAgency =
      profile && profile.role !== 'client_owner' && profile.role !== 'client_member';

    return NextResponse.redirect(new URL(isAgency ? '/dashboard' : '/portal', request.url));
  }

  // Keep portal users out of the agency workspace and vice versa. The database
  // would refuse the data anyway; this just avoids rendering a dead page.
  if (user) {
    const needsRoleCheck =
      pathname.startsWith('/portal') || AGENCY_PREFIXES.some((p) => pathname.startsWith(p));

    if (needsRoleCheck) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const isAgency = profile.role !== 'client_owner' && profile.role !== 'client_member';
        if (isAgency && pathname.startsWith('/portal')) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (!isAgency && AGENCY_PREFIXES.some((p) => pathname.startsWith(p))) {
          return NextResponse.redirect(new URL('/portal', request.url));
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never
     * need a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
