import {
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  MessageSquare,
  Settings,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Matches nested routes as well as the exact path. */
  matchPrefix?: boolean;
  /** Key into the badge-count record supplied by the shell. */
  badgeKey?: string;
  adminOnly?: boolean;
}

export const AGENCY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Building2, matchPrefix: true },
  { href: '/projects', label: 'Projects', icon: Briefcase, matchPrefix: true },
  { href: '/change-requests', label: 'Change Requests', icon: FileText, matchPrefix: true, badgeKey: 'changeRequests' },
  { href: '/support', label: 'Support', icon: LifeBuoy, matchPrefix: true, badgeKey: 'support' },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench, matchPrefix: true, badgeKey: 'maintenance' },
  { href: '/tasks', label: 'Tasks', icon: ListTodo, badgeKey: 'tasks' },
  { href: '/files', label: 'Files', icon: FolderOpen },
  { href: '/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
  { href: '/settings', label: 'Settings', icon: Settings, matchPrefix: true, adminOnly: true },
];

export const CLIENT_NAV: NavItem[] = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/projects', label: 'Projects', icon: Briefcase, matchPrefix: true },
  { href: '/portal/requests', label: 'Requests', icon: FileText, matchPrefix: true },
  { href: '/portal/support', label: 'Support', icon: LifeBuoy, matchPrefix: true },
  { href: '/portal/files', label: 'Files', icon: FolderOpen },
  { href: '/portal/maintenance', label: 'Maintenance', icon: ShieldCheck, matchPrefix: true },
  { href: '/portal/messages', label: 'Messages', icon: MessageSquare },
];

/** Shown in the mobile bottom bar — the five most-used destinations. */
export const CLIENT_MOBILE_NAV: NavItem[] = [
  { href: '/portal', label: 'Home', icon: Home },
  { href: '/portal/projects', label: 'Projects', icon: Briefcase, matchPrefix: true },
  { href: '/portal/requests', label: 'Requests', icon: FileText, matchPrefix: true },
  { href: '/portal/support', label: 'Support', icon: LifeBuoy, matchPrefix: true },
  { href: '/portal/maintenance', label: 'Plan', icon: CalendarClock, matchPrefix: true },
];

export const AGENCY_MOBILE_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: Briefcase, matchPrefix: true },
  { href: '/change-requests', label: 'Changes', icon: FileText, matchPrefix: true },
  { href: '/support', label: 'Support', icon: LifeBuoy, matchPrefix: true },
  { href: '/clients', label: 'Clients', icon: Building2, matchPrefix: true },
];
