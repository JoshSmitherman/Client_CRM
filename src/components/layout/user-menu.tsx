'use client';

import { ChevronDown, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { signOutAction } from '@/lib/actions/auth';
import type { ShellUser } from './app-shell';

export function UserMenu({ user }: { user: ShellUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--surface-hover)]"
      >
        <Avatar name={user.name} size="sm" />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[10rem] truncate text-[13px] leading-tight font-medium">
            {user.name}
          </span>
          <span className="block max-w-[10rem] truncate text-[11px] leading-tight text-[var(--text-muted)]">
            {user.roleLabel}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 w-60 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-overlay)]"
        >
          <div className="border-b border-[var(--border-subtle)] px-4 py-3">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[12px] text-[var(--text-muted)]">{user.email}</p>
            {user.organisation ? (
              <p className="mt-1 truncate text-[12px] text-[var(--text-secondary)]">
                {user.organisation}
              </p>
            ) : null}
          </div>

          <Link
            href={user.accountHref}
            role="menuitem"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[var(--surface-hover)]"
          >
            <User className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
            Your account
          </Link>

          <form action={signOutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-hover)]"
            >
              <LogOut className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
