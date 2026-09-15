-- ===========================================================================
-- 0001  Extensions and enumerated types
-- ===========================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email

-- --- Identity ---------------------------------------------------------------
create type public.app_role as enum (
  'agency_admin',
  'project_manager',
  'account_manager',
  'developer',
  'designer',
  'qa',
  'support_agent',
  'client_owner',
  'client_member'
);

create type public.organisation_kind as enum ('agency', 'client');

-- --- Projects ---------------------------------------------------------------
create type public.project_type as enum (
  'new_website',
  'website_redesign',
  'ecommerce',
  'landing_page',
  'website_maintenance',
  'branding',
  'social_media_rebrand',
  'seo',
  'it_consultancy',
  'custom_development'
);

create type public.project_health as enum ('on_track', 'at_risk', 'off_track', 'on_hold');

-- --- Onboarding -------------------------------------------------------------
create type public.onboarding_status as enum (
  'not_started',
  'in_progress',
  'submitted',
  'needs_changes',
  'approved',
  'not_required'
);

-- --- Work -------------------------------------------------------------------
create type public.task_status as enum ('to_do', 'in_progress', 'waiting', 'complete');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.responsibility as enum ('agency', 'client');

-- --- Files ------------------------------------------------------------------
create type public.file_category as enum (
  'image', 'logo', 'video', 'document', 'spreadsheet', 'pdf',
  'brand_asset', 'contract', 'other'
);
create type public.file_approval_status as enum (
  'pending', 'approved', 'rejected', 'needs_replacement'
);

-- --- Website content --------------------------------------------------------
create type public.page_status as enum ('draft', 'submitted', 'needs_changes', 'approved');
create type public.page_kind as enum ('standard', 'landing', 'footer', 'hidden');

-- --- Change requests --------------------------------------------------------
create type public.change_request_category as enum (
  'content_change', 'image_change', 'new_page', 'existing_page_update',
  'design_change', 'bug', 'new_feature', 'integration_change',
  'seo_change', 'technical_request', 'other'
);

create type public.change_request_status as enum (
  'submitted',
  'awaiting_review',
  'more_information_required',
  'quotation_required',
  'awaiting_client_approval',
  'approved',
  'scheduled',
  'in_progress',
  'internal_qa',
  'client_review',
  'completed',
  'rejected',
  'cancelled'
);

create type public.billing_treatment as enum (
  'included_in_plan', 'additional_charge', 'requires_quotation', 'out_of_scope'
);

create type public.quote_decision as enum (
  'pending', 'approved', 'rejected', 'clarification_requested'
);

-- --- Support ----------------------------------------------------------------
create type public.support_category as enum (
  'website_down', 'broken_functionality', 'email_issue', 'domain_issue',
  'hosting_issue', 'security_concern', 'performance_problem',
  'general_support', 'other'
);

create type public.support_status as enum (
  'open', 'triaged', 'awaiting_client', 'in_progress', 'resolved', 'closed'
);

create type public.urgency as enum ('low', 'normal', 'high', 'critical');

-- --- Maintenance ------------------------------------------------------------
create type public.subscription_status as enum (
  'trial', 'active', 'renewal_due', 'suspended', 'cancelled', 'expired'
);

create type public.billing_frequency as enum ('monthly', 'quarterly', 'annual');

create type public.plan_request_type as enum (
  'upgrade', 'downgrade', 'cancellation', 'renewal_discussion'
);

create type public.plan_request_status as enum ('pending', 'approved', 'declined', 'withdrawn');

create type public.usage_type as enum ('change', 'support');

create type public.maintenance_event_type as enum (
  'created', 'activated', 'renewed', 'upgraded', 'downgraded',
  'suspended', 'reactivated', 'cancelled', 'expired', 'allowance_adjusted'
);

create type public.reminder_type as enum (
  'subscription_renewal', 'payment_due', 'maintenance_review',
  'domain_renewal', 'hosting_renewal', 'ssl_expiry', 'licence_renewal',
  'backup_check', 'security_review', 'monthly_report'
);

create type public.reminder_status as enum (
  'scheduled', 'due', 'acknowledged', 'completed', 'dismissed'
);

-- --- Handover ---------------------------------------------------------------
create type public.handover_status as enum ('draft', 'ready', 'delivered', 'accepted');
create type public.handover_item_status as enum (
  'pending', 'in_progress', 'complete', 'not_applicable'
);

-- --- Cross-cutting ----------------------------------------------------------
create type public.approval_decision as enum ('approved', 'rejected', 'changes_requested');

create type public.comment_entity as enum (
  'project', 'task', 'file', 'website_page', 'change_request',
  'support_request', 'onboarding_section', 'handover_item', 'milestone'
);

create type public.activity_visibility as enum ('internal', 'client');

create type public.integration_status as enum (
  'not_required', 'requested', 'pending', 'configured'
);

create type public.notification_type as enum (
  'onboarding_submitted',
  'onboarding_needs_changes',
  'change_request_submitted',
  'change_request_updated',
  'change_request_quote_ready',
  'support_request_opened',
  'support_request_updated',
  'comment_added',
  'approval_received',
  'changes_requested',
  'file_uploaded',
  'task_assigned',
  'task_overdue',
  'project_ready_for_handover',
  'handover_accepted',
  'maintenance_renewal_due',
  'maintenance_allowance_low',
  'subscription_expired',
  'plan_request_submitted',
  'invitation_accepted'
);
