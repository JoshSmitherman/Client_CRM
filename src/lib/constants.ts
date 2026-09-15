/**
 * Human labels and status tones for every enum in the schema.
 *
 * Kept in one place so a status never renders as a raw `snake_case` value and
 * so colour meaning stays consistent: neutral = inert, info = in flight,
 * warning = waiting on somebody, success = done, danger = a problem.
 */
import type { Enums } from '@/lib/supabase/database.types';

export type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'accent';

// --- Projects ----------------------------------------------------------------

export const PROJECT_TYPE_LABELS: Record<Enums<'project_type'>, string> = {
  new_website: 'New Website',
  website_redesign: 'Website Redesign',
  ecommerce: 'Ecommerce',
  landing_page: 'Landing Page',
  website_maintenance: 'Website Maintenance',
  branding: 'Branding',
  social_media_rebrand: 'Social Media Rebrand',
  seo: 'SEO',
  it_consultancy: 'IT Consultancy',
  custom_development: 'Custom Development',
};

export const PROJECT_HEALTH_LABELS: Record<Enums<'project_health'>, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
  on_hold: 'On hold',
};

export const PROJECT_HEALTH_TONES: Record<Enums<'project_health'>, Tone> = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'danger',
  on_hold: 'neutral',
};

// --- Onboarding --------------------------------------------------------------

export const ONBOARDING_STATUS_LABELS: Record<Enums<'onboarding_status'>, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  submitted: 'Submitted',
  needs_changes: 'Needs Changes',
  approved: 'Approved',
  not_required: 'Not Required',
};

export const ONBOARDING_STATUS_TONES: Record<Enums<'onboarding_status'>, Tone> = {
  not_started: 'neutral',
  in_progress: 'info',
  submitted: 'accent',
  needs_changes: 'warning',
  approved: 'success',
  not_required: 'neutral',
};

// --- Tasks -------------------------------------------------------------------

export const TASK_STATUS_LABELS: Record<Enums<'task_status'>, string> = {
  to_do: 'To Do',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  complete: 'Complete',
};

export const TASK_STATUS_TONES: Record<Enums<'task_status'>, Tone> = {
  to_do: 'neutral',
  in_progress: 'info',
  waiting: 'warning',
  complete: 'success',
};

export const PRIORITY_LABELS: Record<Enums<'task_priority'>, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_TONES: Record<Enums<'task_priority'>, Tone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

export const RESPONSIBILITY_LABELS: Record<Enums<'responsibility'>, string> = {
  agency: 'Agency',
  client: 'Client',
};

export const WORK_STREAM_LABELS: Record<string, string> = {
  discovery: 'Discovery',
  design: 'Design',
  development: 'Development',
  content: 'Content',
  qa: 'QA',
  launch: 'Launch',
  other: 'Other',
};

// --- Files -------------------------------------------------------------------

export const FILE_CATEGORY_LABELS: Record<Enums<'file_category'>, string> = {
  image: 'Image',
  logo: 'Logo',
  video: 'Video',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  pdf: 'PDF',
  brand_asset: 'Brand Asset',
  contract: 'Contract',
  other: 'Other',
};

export const FILE_APPROVAL_LABELS: Record<Enums<'file_approval_status'>, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  needs_replacement: 'Needs Replacement',
};

export const FILE_APPROVAL_TONES: Record<Enums<'file_approval_status'>, Tone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  needs_replacement: 'warning',
};

// --- Website content ---------------------------------------------------------

export const PAGE_STATUS_LABELS: Record<Enums<'page_status'>, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  needs_changes: 'Needs Changes',
  approved: 'Approved',
};

export const PAGE_STATUS_TONES: Record<Enums<'page_status'>, Tone> = {
  draft: 'neutral',
  submitted: 'accent',
  needs_changes: 'warning',
  approved: 'success',
};

export const PAGE_KIND_LABELS: Record<Enums<'page_kind'>, string> = {
  standard: 'Standard page',
  landing: 'Landing page',
  footer: 'Footer page',
  hidden: 'Hidden page',
};

// --- Change requests ---------------------------------------------------------

export const CHANGE_CATEGORY_LABELS: Record<Enums<'change_request_category'>, string> = {
  content_change: 'Content Change',
  image_change: 'Image Change',
  new_page: 'New Page',
  existing_page_update: 'Existing Page Update',
  design_change: 'Design Change',
  bug: 'Bug',
  new_feature: 'New Feature',
  integration_change: 'Integration Change',
  seo_change: 'SEO Change',
  technical_request: 'Technical Request',
  other: 'Other',
};

export const CHANGE_STATUS_LABELS: Record<Enums<'change_request_status'>, string> = {
  submitted: 'Submitted',
  awaiting_review: 'Awaiting Review',
  more_information_required: 'More Information Required',
  quotation_required: 'Quotation Required',
  awaiting_client_approval: 'Awaiting Client Approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  internal_qa: 'Internal QA',
  client_review: 'Client Review',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const CHANGE_STATUS_TONES: Record<Enums<'change_request_status'>, Tone> = {
  submitted: 'accent',
  awaiting_review: 'info',
  more_information_required: 'warning',
  quotation_required: 'warning',
  awaiting_client_approval: 'warning',
  approved: 'success',
  scheduled: 'info',
  in_progress: 'info',
  internal_qa: 'info',
  client_review: 'warning',
  completed: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** Statuses that count as "open" on dashboards and queues. */
export const OPEN_CHANGE_STATUSES: Enums<'change_request_status'>[] = [
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
];

export const BILLING_TREATMENT_LABELS: Record<Enums<'billing_treatment'>, string> = {
  included_in_plan: 'Included in Plan',
  additional_charge: 'Additional Charge',
  requires_quotation: 'Requires Quotation',
  out_of_scope: 'Out of Scope',
};

export const BILLING_TREATMENT_TONES: Record<Enums<'billing_treatment'>, Tone> = {
  included_in_plan: 'success',
  additional_charge: 'warning',
  requires_quotation: 'info',
  out_of_scope: 'danger',
};

export const QUOTE_DECISION_LABELS: Record<Enums<'quote_decision'>, string> = {
  pending: 'Awaiting your decision',
  approved: 'Approved',
  rejected: 'Rejected',
  clarification_requested: 'Clarification requested',
};

// --- Support -----------------------------------------------------------------

export const SUPPORT_CATEGORY_LABELS: Record<Enums<'support_category'>, string> = {
  website_down: 'Website Down',
  broken_functionality: 'Broken Functionality',
  email_issue: 'Email Issue',
  domain_issue: 'Domain Issue',
  hosting_issue: 'Hosting Issue',
  security_concern: 'Security Concern',
  performance_problem: 'Performance Problem',
  general_support: 'General Support',
  other: 'Other',
};

export const SUPPORT_STATUS_LABELS: Record<Enums<'support_status'>, string> = {
  open: 'Open',
  triaged: 'Triaged',
  awaiting_client: 'Awaiting Client',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SUPPORT_STATUS_TONES: Record<Enums<'support_status'>, Tone> = {
  open: 'accent',
  triaged: 'info',
  awaiting_client: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
};

export const OPEN_SUPPORT_STATUSES: Enums<'support_status'>[] = [
  'open',
  'triaged',
  'awaiting_client',
  'in_progress',
];

export const URGENCY_LABELS: Record<Enums<'urgency'>, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  critical: 'Critical',
};

export const URGENCY_TONES: Record<Enums<'urgency'>, Tone> = {
  low: 'neutral',
  normal: 'info',
  high: 'warning',
  critical: 'danger',
};

// --- Maintenance -------------------------------------------------------------

export const SUBSCRIPTION_STATUS_LABELS: Record<Enums<'subscription_status'>, string> = {
  trial: 'Trial',
  active: 'Active',
  renewal_due: 'Renewal Due',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const SUBSCRIPTION_STATUS_TONES: Record<Enums<'subscription_status'>, Tone> = {
  trial: 'info',
  active: 'success',
  renewal_due: 'warning',
  suspended: 'warning',
  cancelled: 'neutral',
  expired: 'danger',
};

export const BILLING_FREQUENCY_LABELS: Record<Enums<'billing_frequency'>, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
};

export const PLAN_REQUEST_TYPE_LABELS: Record<Enums<'plan_request_type'>, string> = {
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  cancellation: 'Cancellation',
  renewal_discussion: 'Renewal discussion',
};

export const PLAN_REQUEST_STATUS_LABELS: Record<Enums<'plan_request_status'>, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

export const REMINDER_TYPE_LABELS: Record<Enums<'reminder_type'>, string> = {
  subscription_renewal: 'Subscription renewal',
  payment_due: 'Payment due',
  maintenance_review: 'Maintenance review',
  domain_renewal: 'Domain renewal',
  hosting_renewal: 'Hosting renewal',
  ssl_expiry: 'SSL expiry',
  licence_renewal: 'Licence renewal',
  backup_check: 'Backup check',
  security_review: 'Security review',
  monthly_report: 'Monthly maintenance report',
};

export const REMINDER_STATUS_LABELS: Record<Enums<'reminder_status'>, string> = {
  scheduled: 'Scheduled',
  due: 'Due',
  acknowledged: 'Acknowledged',
  completed: 'Completed',
  dismissed: 'Dismissed',
};

export const MAINTENANCE_EVENT_LABELS: Record<Enums<'maintenance_event_type'>, string> = {
  created: 'Subscription created',
  activated: 'Subscription activated',
  renewed: 'Subscription renewed',
  upgraded: 'Plan upgraded',
  downgraded: 'Plan downgraded',
  suspended: 'Subscription suspended',
  reactivated: 'Subscription reactivated',
  cancelled: 'Subscription cancelled',
  expired: 'Subscription expired',
  allowance_adjusted: 'Allowance adjusted',
};

// --- Handover ----------------------------------------------------------------

export const HANDOVER_STATUS_LABELS: Record<Enums<'handover_status'>, string> = {
  draft: 'Draft',
  ready: 'Ready',
  delivered: 'Delivered',
  accepted: 'Accepted',
};

export const HANDOVER_STATUS_TONES: Record<Enums<'handover_status'>, Tone> = {
  draft: 'neutral',
  ready: 'info',
  delivered: 'accent',
  accepted: 'success',
};

export const HANDOVER_ITEM_STATUS_LABELS: Record<Enums<'handover_item_status'>, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  complete: 'Complete',
  not_applicable: 'Not Applicable',
};

export const HANDOVER_DOC_TYPE_LABELS: Record<string, string> = {
  user_guide: 'User guide',
  training_video: 'Training video',
  documentation: 'Website documentation',
  brand_guidelines: 'Brand guidelines',
  technical: 'Technical documentation',
  maintenance: 'Maintenance information',
  backup_instructions: 'Backup instructions',
  cms_guide: 'CMS guide',
  other: 'Other',
};

// --- Integrations ------------------------------------------------------------

export const INTEGRATION_STATUS_LABELS: Record<Enums<'integration_status'>, string> = {
  not_required: 'Not Required',
  requested: 'Requested',
  pending: 'Pending',
  configured: 'Configured',
};

export const INTEGRATION_PROVIDERS = [
  { value: 'google_analytics', label: 'Google Analytics' },
  { value: 'google_tag_manager', label: 'Google Tag Manager' },
  { value: 'google_search_console', label: 'Google Search Console' },
  { value: 'microsoft_clarity', label: 'Microsoft Clarity' },
  { value: 'meta_pixel', label: 'Meta Pixel' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'microsoft_365', label: 'Microsoft 365' },
  { value: 'google_workspace', label: 'Google Workspace' },
  { value: 'crm', label: 'CRM' },
  { value: 'mailchimp', label: 'Mailchimp' },
  { value: 'hubspot', label: 'HubSpot' },
  { value: 'booking_system', label: 'Booking system' },
  { value: 'live_chat', label: 'Live chat' },
  { value: 'existing_api', label: 'Existing API' },
  { value: 'custom', label: 'Custom integration' },
] as const;

export const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'x', label: 'X' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'other', label: 'Other' },
] as const;

// --- Approvals & activity ----------------------------------------------------

export const APPROVAL_DECISION_LABELS: Record<Enums<'approval_decision'>, string> = {
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
};

export const APPROVAL_DECISION_TONES: Record<Enums<'approval_decision'>, Tone> = {
  approved: 'success',
  rejected: 'danger',
  changes_requested: 'warning',
};

/** Options helper for <Select>. */
export function toOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
