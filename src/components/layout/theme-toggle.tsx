'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle({ expanded = true }: { expanded?: boolean }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('crm-theme', next ? 'dark' : 'light');
    } catch {
      // Storage unavailable — the toggle still works for this session.
    }
  }

  // Render a stable placeholder until mounted so server and client markup match.
  const label = mounted ? (isDark ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme';

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
    >
      {mounted && isDark ? (
        <Sun className="h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {expanded ? <span className="truncate">{mounted && isDark ? 'Light mode' : 'Dark mode'}</span> : null}
    </button>
  );
}
