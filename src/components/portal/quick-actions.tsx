import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardList,
  FileText,
  FolderOpen,
  LifeBuoy,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Action {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  primary?: boolean;
}

/**
 * The six prominent actions the spec asks for. "Continue onboarding" only
 * appears when there is onboarding left to do, so the panel never offers a
 * dead end.
 */
export function QuickActions({
  onboardingProjectId,
  firstProjectId,
}: {
  onboardingProjectId: string | null;
  firstProjectId: string | null;
}) {
  const actions: Action[] = [];

  if (onboardingProjectId) {
    actions.push({
      href: `/portal/projects/${onboardingProjectId}/onboarding`,
      label: 'Continue onboarding',
      description: 'Pick up where you left off',
      icon: ClipboardList,
      primary: true,
    });
  }

  if (firstProjectId) {
    actions.push({
      href: `/portal/projects/${firstProjectId}`,
      label: 'View your project',
      description: 'Progress, stage and what is next',
      icon: ArrowRight,
    });
  }

  actions.push(
    {
      href: '/portal/requests/new',
      label: 'Submit a change request',
      description: 'Ask us to change something on your website',
      icon: FileText,
      primary: !onboardingProjectId,
    },
    {
      href: '/portal/support/new',
      label: 'Raise a support request',
      description: 'Something is broken or urgent',
      icon: LifeBuoy,
    },
    {
      href: '/portal/files',
      label: 'Upload a file',
      description: 'Logos, photos and documents',
      icon: Upload,
    },
    {
      href: '/portal/maintenance',
      label: 'View your maintenance plan',
      description: 'What is included and what you have used',
      icon: ShieldCheck,
    },
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          to={action.href}
          className={cn(
            'group flex items-start gap-3 rounded-xl border p-4 transition-colors',
            action.primary
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] hover:brightness-[0.98]'
              : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-hover)]',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              action.primary
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
            )}
          >
            <action.icon className="h-4 w-4" aria-hidden="true" />
          </span>

          <span className="min-w-0">
            <span
              className={cn(
                'block text-[14px] font-semibold',
                action.primary && 'text-[var(--accent-text)]',
              )}
            >
              {action.label}
            </span>
            <span className="block text-[12px] text-[var(--text-secondary)]">
              {action.description}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export { FolderOpen };
