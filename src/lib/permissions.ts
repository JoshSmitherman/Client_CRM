/**
 * UI-side mirror of the SQL predicates in migration 0010.
 *
 * This module decides what to RENDER. It is not a security boundary — the
 * database refuses anything these functions would wrongly allow. Keeping the
 * two in step is deliberate: the database cannot render a button, and the UI
 * cannot be trusted.
 *
 * SQL counterpart                UI counterpart
 * ------------------------------ ---------------------------------
 * is_agency()                    isAgency(role)
 * is_agency_admin()              isAgencyAdmin(role)
 * is_agency_manager()            isAgencyManager(role)
 * is_client()                    isClientRole(role)
 * can_edit_project()             canEditProject(role, membership)
 */
import type { Enums } from '@/lib/supabase/database.types';

export type AppRole = Enums<'app_role'>;

export const AGENCY_ROLES: AppRole[] = [
  'agency_admin',
  'project_manager',
  'account_manager',
  'developer',
  'designer',
  'qa',
  'support_agent',
];

export const CLIENT_ROLES: AppRole[] = ['client_owner', 'client_member'];

/** Roles that see every client and project without explicit membership. */
export const MANAGER_ROLES: AppRole[] = ['agency_admin', 'project_manager'];

export const ROLE_LABELS: Record<AppRole, string> = {
  agency_admin: 'Agency administrator',
  project_manager: 'Project manager',
  account_manager: 'Account manager',
  developer: 'Developer',
  designer: 'Designer',
  qa: 'QA',
  support_agent: 'Support agent',
  client_owner: 'Client administrator',
  client_member: 'Client team member',
};

export const isAgency = (role: AppRole): boolean => !CLIENT_ROLES.includes(role);
export const isAgencyAdmin = (role: AppRole): boolean => role === 'agency_admin';
export const isAgencyManager = (role: AppRole): boolean => MANAGER_ROLES.includes(role);
export const isClientRole = (role: AppRole): boolean => CLIENT_ROLES.includes(role);

export interface ProjectMembership {
  isMember: boolean;
  canEdit: boolean;
  isAccountManager: boolean;
}

export function canEditProject(role: AppRole, membership: ProjectMembership): boolean {
  if (!isAgency(role)) return false;
  if (isAgencyManager(role)) return true;
  if (membership.isAccountManager) return true;
  return membership.isMember && membership.canEdit;
}

/** Only agency users may write internal notes and internal comments. */
export const canWriteInternalNotes = (role: AppRole): boolean => isAgency(role);

/** Only agency users approve submissions, files and content. */
export const canApprove = (role: AppRole): boolean => isAgency(role);

/** Settings, maintenance plan configuration, team management, audit log. */
export const canManageSettings = (role: AppRole): boolean => isAgencyAdmin(role);

/** Only a client administrator may sign off the formal handover acceptance. */
export const canAcceptHandover = (role: AppRole): boolean => role === 'client_owner';

/** Client administrators may invite colleagues into their own organisation. */
export const canInviteColleagues = (role: AppRole): boolean =>
  role === 'client_owner' || isAgencyAdmin(role);
