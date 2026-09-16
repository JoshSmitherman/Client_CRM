
import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Writes to audit_logs through the record_audit() SECURITY DEFINER function.
 * audit_logs has no INSERT policy, so this is the only path in — which is what
 * makes the log trustworthy.
 *
 * Deliberately never throws: an audit failure must not roll back the user's
 * work, but it must be visible in the server logs.
 */
export async function recordAudit(params: {
  action: string;
  entityType: string;
  entityId: string | null;
  previousValue?: Json;
  newValue?: Json;
}): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_audit', {
      p_action: params.action,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_previous_value: params.previousValue ?? null,
      p_new_value: params.newValue ?? null,
      // The browser cannot know its own public address; Postgres records the
      // authenticated user, which is the part that matters.
      p_ip_address: null,
      p_user_agent: navigator.userAgent,
    });

    if (error) console.error('[audit] failed to record', params.action, error.message);
  } catch (error) {
    console.error('[audit] unexpected failure', error);
  }
}

/** Audit actions used across the application, kept consistent in one place. */
export const AuditAction = {
  ClientCreated: 'client.created',
  ClientUpdated: 'client.updated',
  ClientDeleted: 'client.deleted',
  ProjectCreated: 'project.created',
  ProjectUpdated: 'project.updated',
  ProjectStageChanged: 'project.stage_changed',
  InvitationSent: 'invitation.sent',
  InvitationRevoked: 'invitation.revoked',
  PermissionsChanged: 'permissions.changed',
  Approved: 'approval.approved',
  Rejected: 'approval.rejected',
  ChangesRequested: 'approval.changes_requested',
  FileUploaded: 'file.uploaded',
  FileDeleted: 'file.deleted',
  FileApprovalChanged: 'file.approval_changed',
  ChangeRequestCreated: 'change_request.created',
  ChangeRequestStatusChanged: 'change_request.status_changed',
  ChangeRequestQuoted: 'change_request.quoted',
  ChangeRequestDecision: 'change_request.client_decision',
  SupportRequestCreated: 'support_request.created',
  SupportRequestUpdated: 'support_request.updated',
  SubscriptionCreated: 'subscription.created',
  SubscriptionUpdated: 'subscription.updated',
  SubscriptionCancelled: 'subscription.cancelled',
  UsageRecorded: 'maintenance.usage_recorded',
  PlanRequestSubmitted: 'maintenance.plan_request_submitted',
  PlanRequestReviewed: 'maintenance.plan_request_reviewed',
  HandoverDelivered: 'handover.delivered',
  HandoverAccepted: 'handover.accepted',
  OnboardingSubmitted: 'onboarding.submitted',
  OnboardingReviewed: 'onboarding.reviewed',
} as const;
