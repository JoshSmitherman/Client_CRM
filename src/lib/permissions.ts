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

export const AGENCY_ROLES: AppRole[] = ['agency'];
export const CLIENT_ROLES: AppRole[] = ['client'];

/** Kept for the places that ask "can this person see everything?". */
export const MANAGER_ROLES: AppRole[] = ['agency'];

export const ROLE_LABELS: Record<AppRole, string> = {
  agency: 'Agency',
  client: 'Client',
};

/**
 * The two account types, with what each one means.
 *
 * Migration 0018 reduced app_role to exactly these. There is no longer a
 * distinction between an agency administrator and a developer: anyone on the
 * agency side sees every client, changes agency settings, approves new staff,
 * and can permanently delete a client or a project.
 */
export const ACCOUNT_TYPES: { value: AppRole; label: string; description: string }[] = [
  {
    value: 'agency',
    label: 'Agency',
    description:
      'Works here. Sees every client and project, and can change settings and delete records.',
  },
  {
    value: 'client',
    label: 'Client',
    description: 'Sees one organisation only — its projects, files, requests and messages.',
  },
];

export const isAgency = (role: AppRole): boolean => role === 'agency';
export const isClientRole = (role: AppRole): boolean => role === 'client';

/**
 * These three were distinct when there were seven agency roles. They are kept
 * as separate names because the SQL predicates they mirror are also still
 * separate — which is what would let the distinctions come back without
 * touching a hundred policies.
 */
export const isAgencyAdmin = isAgency;
export const isAgencyManager = isAgency;

export interface ProjectMembership {
  isMember: boolean;
  canEdit: boolean;
  isAccountManager: boolean;
}

export function canEditProject(role: AppRole, membership: ProjectMembership): boolean {
  // Membership no longer narrows anything for agency users — with one staff
  // role they can all edit — but the parameter stays because project_members
  // still governs assignment and notification.
  void membership;
  return isAgency(role);
}

/** Only agency users may write internal notes and internal comments. */
export const canWriteInternalNotes = (role: AppRole): boolean => isAgency(role);

/** Only agency users approve submissions, files and content. */
export const canApprove = (role: AppRole): boolean => isAgency(role);

/** Settings, maintenance plan configuration, team management, audit log. */
export const canManageSettings = (role: AppRole): boolean => isAgencyAdmin(role);

/**
 * Permanent deletion of a client or a project.
 *
 * Mirrors the clients_delete and projects_delete policies from migration 0017.
 */
export const canDeleteRecords = (role: AppRole): boolean => isAgencyManager(role);

/** Any client user may sign off the formal handover acceptance. */
export const canAcceptHandover = (role: AppRole): boolean => isClientRole(role);

/**
 * Only the agency issues logins.
 *
 * A client administrator could once invite colleagues into their own
 * organisation. With a single client role there is nobody to distinguish, and
 * the policies that allowed it went with migration 0018 — so this is now the
 * agency alone, which is what the brief asked for to begin with.
 */
export const canInviteColleagues = (role: AppRole): boolean => isAgency(role);
