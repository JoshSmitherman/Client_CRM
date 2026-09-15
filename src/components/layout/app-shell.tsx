'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { brand } from '@/config/brand';
import { cn } from '@/lib/utils';
import type { NavItem } from './navigation';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export interface ShellUser {
  name: string;
  email: string;
  roleLabel: string;
  organisation: string | null;
  /** Agency and portal users have separate account pages. */
  accountHref: string;
}

export function AppShell({
  nav,
  mobileNav,
  user,
  badges = {},
  isAdmin,
  children,
}: {
  nav: NavItem[];
  mobileNav: NavItem[];
  user: ShellUser;
  badges?: Record<string, number>;
  isAdmin: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Restore the sidebar preference after mount so the server render is stable.
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('crm-sidebar') === 'collapsed');
    } catch {
      // Storage unavailable; keep the default.
    }
  }, []);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Escape closes the drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem('crm-sidebar', next ? 'collapsed' : 'expanded');
    } catch {
      // Ignore — the preference simply will not persist.
    }
  }

  const visibleNav = nav.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-dvh">
      {/* ---------------- Desktop sidebar ---------------- */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-card)] lg:flex',
          'transition-[width] duration-200',
          collapsed ? 'w-[68px]' : 'w-64',
        )}
      >
        <BrandMark collapsed={collapsed} />

        <NavList items={visibleNav} pathname={pathname} badges={badges} collapsed={collapsed} />

        <div className="space-y-1 border-t border-[var(--border-subtle)] p-3">
          <ThemeToggle expanded={!collapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {!collapsed ? <span className="truncate">Collapse</span> : null}
          </button>
        </div>
      </aside>

      {/* ---------------- Mobile drawer ---------------- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          />
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <BrandMark collapsed={false} bare />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <NavList items={visibleNav} pathname={pathname} badges={badges} collapsed={false} />
            <div className="border-t border-[var(--border-subtle)] p-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Main column ---------------- */}
      <div className={cn('flex min-h-dvh flex-col transition-[padding]', collapsed ? 'lg:pl-[68px]' : 'lg:pl-64')}>
        <header
          className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/85 px-4 backdrop-blur"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <span className="truncate text-sm font-semibold lg:hidden">{brand.shortName}</span>

          <div className="ml-auto">
            <UserMenu user={user} />
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        {/* Mobile bottom bar — thumb-reachable primary destinations. */}
        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Primary"
        >
          {mobileNav.map((item) => {
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium',
                  active ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function BrandMark({ collapsed, bare = false }: { collapsed: boolean; bare?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', !bare && 'h-14 border-b border-[var(--border-subtle)] px-4')}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[13px] font-bold text-white">
        {brand.initials}
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-sm leading-tight font-semibold">{brand.shortName}</span>
          <span className="block truncate text-[11px] leading-tight text-[var(--text-muted)]">
            {brand.productName}
          </span>
        </span>
      ) : null}
    </div>
  );
}

function NavList({
  items,
  pathname,
  badges,
  collapsed,
}: {
  items: NavItem[];
  pathname: string;
  badges: Record<string, number>;
  collapsed: boolean;
}) {
  return (
    <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        const count = item.badgeKey ? (badges[item.badgeKey] ?? 0) : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
              collapsed && 'justify-center px-0',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            {!collapsed ? (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white tabular-nums">
                    {count > 99 ? '99+' : count}
                  </span>
                ) : null}
              </>
            ) : count > 0 ? (
              <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
            ) : null}
            {collapsed ? <span className="sr-only">{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  return Boolean(item.matchPrefix) && pathname.startsWith(`${item.href}/`);
}
