-- ===========================================================================
-- Client Portal — complete database setup
-- ===========================================================================
--
-- GENERATED FILE — do not edit by hand.
-- Rebuild with:  node scripts/build-setup-sql.mjs
--
-- HOW TO USE
--   1. Open your Supabase project
--   2. SQL Editor -> New query
--   3. Paste this entire file and press Run
--
-- It creates 40 tables, 34 enum types, the permission functions, every Row
-- Level Security policy, the column guard triggers, the private storage bucket
-- and the agency-configurable reference data (lifecycle stages, the onboarding
-- template, example maintenance tiers, the handover checklist).
--
-- Safe to run more than once: every statement is guarded, so a retry after a
-- half-finished run does not error and does not duplicate anything.
--
-- It does NOT create any user accounts. Do that afterwards with the
-- "Seed demo data" GitHub Action, or `node scripts/seed-demo.mjs`.
--
-- Source: supabase/migrations/*.sql and supabase/seed.sql
--
-- Deliberately carries no generation timestamp: the output must be byte-for-byte
-- reproducible so CI can check it still matches the migrations.
-- ===========================================================================

-- ###########################################################################
-- 0001_extensions_and_enums.sql
-- ###########################################################################
-- ===========================================================================
-- 0001  Extensions and enumerated types
-- ===========================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email

-- --- Identity ---------------------------------------------------------------
do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.organisation_kind as enum ('agency', 'client');
exception when duplicate_object then null; end $$;

-- --- Projects ---------------------------------------------------------------
do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_health as enum ('on_track', 'at_risk', 'off_track', 'on_hold');
exception when duplicate_object then null; end $$;

-- --- Onboarding -------------------------------------------------------------
do $$ begin
  create type public.onboarding_status as enum (
    'not_started',
    'in_progress',
    'submitted',
    'needs_changes',
    'approved',
    'not_required'
  );
exception when duplicate_object then null; end $$;

-- --- Work -------------------------------------------------------------------
do $$ begin
  create type public.task_status as enum ('to_do', 'in_progress', 'waiting', 'complete');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.responsibility as enum ('agency', 'client');
exception when duplicate_object then null; end $$;

-- --- Files ------------------------------------------------------------------
do $$ begin
  create type public.file_category as enum (
    'image', 'logo', 'video', 'document', 'spreadsheet', 'pdf',
    'brand_asset', 'contract', 'other'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.file_approval_status as enum (
    'pending', 'approved', 'rejected', 'needs_replacement'
  );
exception when duplicate_object then null; end $$;

-- --- Website content --------------------------------------------------------
do $$ begin
  create type public.page_status as enum ('draft', 'submitted', 'needs_changes', 'approved');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.page_kind as enum ('standard', 'landing', 'footer', 'hidden');
exception when duplicate_object then null; end $$;

-- --- Change requests --------------------------------------------------------
do $$ begin
  create type public.change_request_category as enum (
    'content_change', 'image_change', 'new_page', 'existing_page_update',
    'design_change', 'bug', 'new_feature', 'integration_change',
    'seo_change', 'technical_request', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_treatment as enum (
    'included_in_plan', 'additional_charge', 'requires_quotation', 'out_of_scope'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.quote_decision as enum (
    'pending', 'approved', 'rejected', 'clarification_requested'
  );
exception when duplicate_object then null; end $$;

-- --- Support ----------------------------------------------------------------
do $$ begin
  create type public.support_category as enum (
    'website_down', 'broken_functionality', 'email_issue', 'domain_issue',
    'hosting_issue', 'security_concern', 'performance_problem',
    'general_support', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.support_status as enum (
    'open', 'triaged', 'awaiting_client', 'in_progress', 'resolved', 'closed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.urgency as enum ('low', 'normal', 'high', 'critical');
exception when duplicate_object then null; end $$;

-- --- Maintenance ------------------------------------------------------------
do $$ begin
  create type public.subscription_status as enum (
    'trial', 'active', 'renewal_due', 'suspended', 'cancelled', 'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.billing_frequency as enum ('monthly', 'quarterly', 'annual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_request_type as enum (
    'upgrade', 'downgrade', 'cancellation', 'renewal_discussion'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_request_status as enum ('pending', 'approved', 'declined', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.usage_type as enum ('change', 'support');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_event_type as enum (
    'created', 'activated', 'renewed', 'upgraded', 'downgraded',
    'suspended', 'reactivated', 'cancelled', 'expired', 'allowance_adjusted'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_type as enum (
    'subscription_renewal', 'payment_due', 'maintenance_review',
    'domain_renewal', 'hosting_renewal', 'ssl_expiry', 'licence_renewal',
    'backup_check', 'security_review', 'monthly_report'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reminder_status as enum (
    'scheduled', 'due', 'acknowledged', 'completed', 'dismissed'
  );
exception when duplicate_object then null; end $$;

-- --- Handover ---------------------------------------------------------------
do $$ begin
  create type public.handover_status as enum ('draft', 'ready', 'delivered', 'accepted');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.handover_item_status as enum (
    'pending', 'in_progress', 'complete', 'not_applicable'
  );
exception when duplicate_object then null; end $$;

-- --- Cross-cutting ----------------------------------------------------------
do $$ begin
  create type public.approval_decision as enum ('approved', 'rejected', 'changes_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.comment_entity as enum (
    'project', 'task', 'file', 'website_page', 'change_request',
    'support_request', 'onboarding_section', 'handover_item', 'milestone'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_visibility as enum ('internal', 'client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.integration_status as enum (
    'not_required', 'requested', 'pending', 'configured'
  );
exception when duplicate_object then null; end $$;

do $$ begin
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
exception when duplicate_object then null; end $$;

-- ###########################################################################
-- 0002_identity.sql
-- ###########################################################################
-- ===========================================================================
-- 0002  Identity, tenancy and agency configuration
-- ===========================================================================

-- Shared updated_at trigger ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- organisations -----------------------------------------------------------
-- Tenancy root. Exactly one row with kind = 'agency'; one row per client company.
create table if not exists public.organisations (
  id               uuid primary key default gen_random_uuid(),
  kind             public.organisation_kind not null,
  name             text not null check (length(trim(name)) between 1 and 200),
  slug             text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$'),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create unique index if not exists organisations_single_agency_idx
  on public.organisations ((kind))
  where kind = 'agency' and deleted_at is null;

create index if not exists organisations_kind_idx
  on public.organisations (kind) where deleted_at is null;

drop trigger if exists organisations_set_updated_at on public.organisations;
create trigger organisations_set_updated_at
  before update on public.organisations
  for each row execute function public.set_updated_at();

-- --- users -------------------------------------------------------------------
-- Profile mirror of auth.users. Created by the handle_new_user trigger.
create table if not exists public.users (
  id               uuid primary key references auth.users (id) on delete cascade,
  email            citext not null unique,
  full_name        text not null default '',
  avatar_url       text,
  role             public.app_role not null default 'client_member',
  organisation_id  uuid references public.organisations (id) on delete set null,
  job_title        text,
  phone            text,
  is_active        boolean not null default true,
  last_seen_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index if not exists users_organisation_idx
  on public.users (organisation_id) where deleted_at is null;
create index if not exists users_role_idx
  on public.users (role) where deleted_at is null;
-- Deliberately no role in the predicate. Naming values here would pin this
-- file to one shape of the enum, and Postgres validates an index predicate
-- before it honours `if not exists` — so a later migration that changes the
-- enum would make re-running this file fail. Migration 0018 narrows it to
-- agency accounts once the vocabulary is settled.
create index if not exists users_active_agency_idx
  on public.users (role)
  where is_active and deleted_at is null;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- --- agency_settings ---------------------------------------------------------
-- Singleton configuration row. `id` is pinned so there can only ever be one.
create table if not exists public.agency_settings (
  id                            boolean primary key default true check (id),
  agency_name                   text not null default 'Northpoint Digital',
  tagline                       text not null default 'Web design, development and support',
  support_email                 citext,
  support_phone                 text,
  brand_primary                 text not null default '#4f46e5',
  logo_url                      text,
  currency                      text not null default 'GBP' check (length(currency) = 3),
  -- Feature switches
  allow_client_plan_selection   boolean not null default true,
  allow_client_colleague_invites boolean not null default true,
  -- Defaults
  default_reminder_offsets      integer[] not null default '{60,30,14,7,0}',
  legal_advice_disclaimer       text not null default
    'We do not provide legal advice. Policy and compliance documents are only produced where explicitly included in your contract.',
  credential_sharing_guidance   text not null default
    'Never type passwords into this portal. Share credentials using the secure credential link your account manager provides.',
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);

drop trigger if exists agency_settings_set_updated_at on public.agency_settings;
create trigger agency_settings_set_updated_at
  before update on public.agency_settings
  for each row execute function public.set_updated_at();

-- --- invitations -------------------------------------------------------------
-- The only route to an account. There is no public signup.
create table if not exists public.invitations (
  id               uuid primary key default gen_random_uuid(),
  email            citext not null,
  full_name        text not null default '',
  role             public.app_role not null,
  organisation_id  uuid references public.organisations (id) on delete cascade,
  client_id        uuid,  -- FK added in 0003 once clients exists
  token            text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by       uuid references public.users (id) on delete set null,
  message          text,
  expires_at       timestamptz not null default (now() + interval '14 days'),
  accepted_at      timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- One live invitation per email address.
create unique index if not exists invitations_pending_email_idx
  on public.invitations (email)
  where accepted_at is null and revoked_at is null;

create index if not exists invitations_organisation_idx
  on public.invitations (organisation_id);

drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function public.set_updated_at();

comment on table public.invitations is
  'Invite-only provisioning. handle_new_user() consumes the matching row when the invitee signs up.';

-- ###########################################################################
-- 0003_clients_projects.sql
-- ###########################################################################
-- ===========================================================================
-- 0003  CRM records, lifecycle stages, projects and membership
-- ===========================================================================

-- --- clients -----------------------------------------------------------------
create table if not exists public.clients (
  id                    uuid primary key default gen_random_uuid(),
  organisation_id       uuid not null unique references public.organisations (id) on delete cascade,
  company_name          text not null check (length(trim(company_name)) between 1 and 200),
  trading_name          text,
  registration_number   text,
  primary_contact_name  text,
  email                 citext,
  phone                 text,
  website               text,
  address_line1         text,
  address_line2         text,
  city                  text,
  region                text,
  postcode              text,
  country               text default 'United Kingdom',
  industry              text,
  description           text,
  is_existing_client    boolean not null default false,
  account_manager_id    uuid references public.users (id) on delete set null,
  -- Agency-only notes live in public.internal_notes (migration 0015): Row
  -- Level Security restricts rows, not columns, so anything agency-only on a
  -- client-readable row is readable straight from the API.
  is_active             boolean not null default true,
  created_by            uuid references public.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index if not exists clients_account_manager_idx
  on public.clients (account_manager_id) where deleted_at is null;
create index if not exists clients_active_idx
  on public.clients (is_active) where deleted_at is null;
create index if not exists clients_company_name_idx
  on public.clients (lower(company_name)) where deleted_at is null;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Deferred FK from 0002.
do $$ begin
  alter table public.invitations
    add constraint invitations_client_id_fkey
    foreign key (client_id) references public.clients (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- --- lifecycle_stages --------------------------------------------------------
-- Stages are data, not an enum, so administrators can customise them later.
create table if not exists public.lifecycle_stages (
  id                      uuid primary key default gen_random_uuid(),
  key                     text not null unique check (key ~ '^[a-z0-9_]{2,50}$'),
  label                   text not null,
  description             text,
  position                integer not null,
  colour                  text not null default '#64748b',
  is_active               boolean not null default true,
  is_terminal             boolean not null default false,
  -- Stages such as "Archived" should not drag the progress calculation.
  counts_toward_progress  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index if not exists lifecycle_stages_position_idx
  on public.lifecycle_stages (position);

drop trigger if exists lifecycle_stages_set_updated_at on public.lifecycle_stages;
create trigger lifecycle_stages_set_updated_at
  before update on public.lifecycle_stages
  for each row execute function public.set_updated_at();

-- --- projects ----------------------------------------------------------------
create sequence if not exists public.project_reference_seq;

create table if not exists public.projects (
  id                      uuid primary key default gen_random_uuid(),
  client_id               uuid not null references public.clients (id) on delete cascade,
  reference               text not null unique
                            default 'PRJ-' || lpad(nextval('public.project_reference_seq')::text, 4, '0'),
  name                    text not null check (length(trim(name)) between 1 and 200),
  project_type            public.project_type not null,
  description             text,
  stage_id                uuid references public.lifecycle_stages (id) on delete set null,
  health                  public.project_health not null default 'on_track',
  target_start_date       date,
  target_launch_date      date,
  actual_launch_date      date,
  completion_percentage   integer not null default 0 check (completion_percentage between 0 and 100),
  created_by              uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  archived_at             timestamptz,
  deleted_at              timestamptz,
  constraint projects_launch_after_start
    check (target_launch_date is null or target_start_date is null
           or target_launch_date >= target_start_date)
);

create index if not exists projects_client_idx
  on public.projects (client_id) where deleted_at is null;
create index if not exists projects_stage_idx
  on public.projects (stage_id) where deleted_at is null;
create index if not exists projects_type_idx
  on public.projects (project_type) where deleted_at is null;
create index if not exists projects_updated_idx
  on public.projects (updated_at desc) where deleted_at is null;
create index if not exists projects_launch_idx
  on public.projects (target_launch_date)
  where deleted_at is null and archived_at is null;
create index if not exists projects_name_idx
  on public.projects (lower(name)) where deleted_at is null;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- --- project_members ---------------------------------------------------------
-- Agency-side authorisation: which staff may see/edit which project.
create table if not exists public.project_members (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  user_id       uuid not null references public.users (id) on delete cascade,
  project_role  text not null default 'contributor',
  can_edit      boolean not null default true,
  added_by      uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_members_user_idx
  on public.project_members (user_id);
create index if not exists project_members_project_idx
  on public.project_members (project_id);

-- ###########################################################################
-- 0004_planning_onboarding_content.sql
-- ###########################################################################
-- ===========================================================================
-- 0004  Planning workspace, onboarding engine, sitemap/content, integrations
-- ===========================================================================

-- --- project_plans (1:1) -----------------------------------------------------
create table if not exists public.project_plans (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null unique references public.projects (id) on delete cascade,
  scope                     text,
  objectives                text,
  client_responsibilities   text,
  agency_responsibilities   text,
  updated_by                uuid references public.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

drop trigger if exists project_plans_set_updated_at on public.project_plans;
create trigger project_plans_set_updated_at
  before update on public.project_plans
  for each row execute function public.set_updated_at();

-- --- project_deliverables ----------------------------------------------------
create table if not exists public.project_deliverables (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null,
  description   text,
  owner_side    public.responsibility not null default 'agency',
  due_date      date,
  is_complete   boolean not null default false,
  completed_at  timestamptz,
  position      integer not null default 0,
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists project_deliverables_project_idx
  on public.project_deliverables (project_id, position);

drop trigger if exists project_deliverables_set_updated_at on public.project_deliverables;
create trigger project_deliverables_set_updated_at
  before update on public.project_deliverables
  for each row execute function public.set_updated_at();

-- --- project_risks -----------------------------------------------------------
create table if not exists public.project_risks (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null,
  description   text,
  likelihood    text not null default 'medium' check (likelihood in ('low','medium','high')),
  impact        text not null default 'medium' check (impact in ('low','medium','high')),
  mitigation    text,
  status        text not null default 'open' check (status in ('open','mitigated','accepted','closed')),
  owner_id      uuid references public.users (id) on delete set null,
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists project_risks_project_idx
  on public.project_risks (project_id);

drop trigger if exists project_risks_set_updated_at on public.project_risks;
create trigger project_risks_set_updated_at
  before update on public.project_risks
  for each row execute function public.set_updated_at();

-- --- project_milestones ------------------------------------------------------
create table if not exists public.project_milestones (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null,
  description    text,
  target_date    date,
  completed_at   timestamptz,
  completed_by   uuid references public.users (id) on delete set null,
  position       integer not null default 0,
  -- Self-reference models a dependency: this milestone follows another.
  depends_on_id  uuid references public.project_milestones (id) on delete set null,
  owner_side     public.responsibility not null default 'agency',
  created_by     uuid references public.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint project_milestones_no_self_dependency check (depends_on_id is null or depends_on_id <> id)
);

create index if not exists project_milestones_project_idx
  on public.project_milestones (project_id, position);
create index if not exists project_milestones_target_idx
  on public.project_milestones (target_date)
  where completed_at is null;

drop trigger if exists project_milestones_set_updated_at on public.project_milestones;
create trigger project_milestones_set_updated_at
  before update on public.project_milestones
  for each row execute function public.set_updated_at();

-- --- onboarding templates ----------------------------------------------------
create table if not exists public.onboarding_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  project_type  public.project_type,
  is_default    boolean not null default false,
  is_active     boolean not null default true,
  created_by    uuid references public.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists onboarding_templates_single_default_idx
  on public.onboarding_templates ((is_default)) where is_default;

drop trigger if exists onboarding_templates_set_updated_at on public.onboarding_templates;
create trigger onboarding_templates_set_updated_at
  before update on public.onboarding_templates
  for each row execute function public.set_updated_at();

create table if not exists public.onboarding_template_sections (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.onboarding_templates (id) on delete cascade,
  key           text not null check (key ~ '^[a-z0-9_]{2,60}$'),
  title         text not null,
  description   text,
  position      integer not null default 0,
  is_required   boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (template_id, key)
);

drop trigger if exists onboarding_template_sections_set_updated_at on public.onboarding_template_sections;
create trigger onboarding_template_sections_set_updated_at
  before update on public.onboarding_template_sections
  for each row execute function public.set_updated_at();

-- --- onboarding_sections -----------------------------------------------------
-- Answers live in `responses` jsonb, validated server-side by a zod schema
-- chosen by `key`. Structure is configurable; validation stays strict.
create table if not exists public.onboarding_sections (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects (id) on delete cascade,
  key              text not null check (key ~ '^[a-z0-9_]{2,60}$'),
  title            text not null,
  description      text,
  position         integer not null default 0,
  status           public.onboarding_status not null default 'not_started',
  responses        jsonb not null default '{}'::jsonb,
  agency_feedback  text,
  submitted_at     timestamptz,
  submitted_by     uuid references public.users (id) on delete set null,
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (project_id, key)
);

create index if not exists onboarding_sections_project_idx
  on public.onboarding_sections (project_id, position);
create index if not exists onboarding_sections_status_idx
  on public.onboarding_sections (project_id, status);

drop trigger if exists onboarding_sections_set_updated_at on public.onboarding_sections;
create trigger onboarding_sections_set_updated_at
  before update on public.onboarding_sections
  for each row execute function public.set_updated_at();

-- --- onboarding_items --------------------------------------------------------
-- Discrete requirements inside a section ("Primary logo (SVG)", "Brand guidelines")
-- each with their own status, feedback and optional uploaded file.
create table if not exists public.onboarding_items (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references public.onboarding_sections (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  key           text not null,
  label         text not null,
  help_text     text,
  is_required   boolean not null default true,
  status        public.onboarding_status not null default 'not_started',
  value         jsonb,
  file_id       uuid,  -- FK added in 0005 once files exists
  notes         text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (section_id, key)
);

create index if not exists onboarding_items_section_idx
  on public.onboarding_items (section_id, position);
create index if not exists onboarding_items_project_idx
  on public.onboarding_items (project_id);

drop trigger if exists onboarding_items_set_updated_at on public.onboarding_items;
create trigger onboarding_items_set_updated_at
  before update on public.onboarding_items
  for each row execute function public.set_updated_at();

-- --- website_pages -----------------------------------------------------------
-- Doubles as the sitemap (parent_id + position + page_kind) and the content store.
create table if not exists public.website_pages (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  parent_id         uuid references public.website_pages (id) on delete cascade,
  title             text not null,
  slug              text,
  page_kind         public.page_kind not null default 'standard',
  in_navigation     boolean not null default true,
  position          integer not null default 0,
  status            public.page_status not null default 'draft',
  purpose           text,
  main_heading      text,
  body_copy         text,
  calls_to_action   jsonb not null default '[]'::jsonb,
  seo_title         text check (seo_title is null or length(seo_title) <= 70),
  meta_description  text check (meta_description is null or length(meta_description) <= 320),
  notes             text,
  agency_feedback   text,
  submitted_at      timestamptz,
  submitted_by      uuid references public.users (id) on delete set null,
  approved_at       timestamptz,
  approved_by       uuid references public.users (id) on delete set null,
  created_by        uuid references public.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  constraint website_pages_no_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists website_pages_project_idx
  on public.website_pages (project_id, position)
  where deleted_at is null;
create index if not exists website_pages_parent_idx
  on public.website_pages (parent_id) where deleted_at is null;

drop trigger if exists website_pages_set_updated_at on public.website_pages;
create trigger website_pages_set_updated_at
  before update on public.website_pages
  for each row execute function public.set_updated_at();

-- --- integrations ------------------------------------------------------------
create table if not exists public.integrations (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  provider           text not null,
  label              text not null,
  status             public.integration_status not null default 'requested',
  -- Account references only (property IDs, container IDs). Never credentials.
  account_reference  text,
  notes              text,
  configured_by      uuid references public.users (id) on delete set null,
  configured_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (project_id, provider)
);

create index if not exists integrations_project_idx
  on public.integrations (project_id);

drop trigger if exists integrations_set_updated_at on public.integrations;
create trigger integrations_set_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

comment on column public.integrations.account_reference is
  'Non-secret identifiers only (e.g. GA4 measurement ID). Credentials are never stored here.';

-- ###########################################################################
-- 0005_files_tasks_comments.sql
-- ###########################################################################
-- ===========================================================================
-- 0005  Media library, tasks, threaded comments, approvals
-- ===========================================================================

-- --- files -------------------------------------------------------------------
create table if not exists public.files (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid references public.projects (id) on delete cascade,
  client_id               uuid not null references public.clients (id) on delete cascade,
  website_page_id         uuid references public.website_pages (id) on delete set null,
  onboarding_section_id   uuid references public.onboarding_sections (id) on delete set null,
  change_request_id       uuid,  -- FK added in 0006
  support_request_id      uuid,  -- FK added in 0006
  bucket                  text not null default 'project-files',
  storage_path            text not null unique,
  file_name               text not null,
  original_name           text not null,
  mime_type               text not null,
  size_bytes              bigint not null check (size_bytes > 0 and size_bytes <= 104857600),
  checksum                text,
  category                public.file_category not null default 'other',
  description             text,
  approval_status         public.file_approval_status not null default 'pending',
  reviewed_by             uuid references public.users (id) on delete set null,
  reviewed_at             timestamptz,
  review_notes            text,
  is_client_visible       boolean not null default true,
  uploaded_by             uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);

create index if not exists files_project_idx
  on public.files (project_id, created_at desc) where deleted_at is null;
create index if not exists files_client_idx
  on public.files (client_id) where deleted_at is null;
create index if not exists files_page_idx
  on public.files (website_page_id) where deleted_at is null;
create index if not exists files_section_idx
  on public.files (onboarding_section_id) where deleted_at is null;
create index if not exists files_approval_idx
  on public.files (approval_status) where deleted_at is null;

drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

-- Deferred FK from 0004.
do $$ begin
  alter table public.onboarding_items
    add constraint onboarding_items_file_id_fkey
    foreign key (file_id) references public.files (id) on delete set null;
exception when duplicate_object then null; end $$;

-- --- tasks -------------------------------------------------------------------
create table if not exists public.tasks (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.projects (id) on delete cascade,
  title                   text not null check (length(trim(title)) between 1 and 300),
  description             text,
  assignee_id             uuid references public.users (id) on delete set null,
  responsibility          public.responsibility not null default 'agency',
  due_date                date,
  priority                public.task_priority not null default 'medium',
  status                  public.task_status not null default 'to_do',
  onboarding_section_id   uuid references public.onboarding_sections (id) on delete set null,
  milestone_id            uuid references public.project_milestones (id) on delete set null,
  -- Marks the task as part of a progress bucket (design/development/qa/content).
  work_stream             text check (work_stream in ('discovery','design','development','content','qa','launch','other')),
  is_client_visible       boolean not null default true,
  position                integer not null default 0,
  completed_at            timestamptz,
  completed_by            uuid references public.users (id) on delete set null,
  created_by              uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);

create index if not exists tasks_project_idx
  on public.tasks (project_id, status) where deleted_at is null;
create index if not exists tasks_assignee_idx
  on public.tasks (assignee_id) where deleted_at is null;
create index if not exists tasks_overdue_idx
  on public.tasks (due_date)
  where status <> 'complete' and deleted_at is null;
create index if not exists tasks_section_idx
  on public.tasks (onboarding_section_id) where deleted_at is null;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- --- comments ----------------------------------------------------------------
-- Polymorphic threads. `project_id` is denormalised purely so RLS can be a
-- cheap index lookup rather than a recursive join per entity type.
create table if not exists public.comments (
  id            uuid primary key default gen_random_uuid(),
  entity_type   public.comment_entity not null,
  entity_id     uuid not null,
  project_id    uuid references public.projects (id) on delete cascade,
  client_id     uuid references public.clients (id) on delete cascade,
  parent_id     uuid references public.comments (id) on delete cascade,
  author_id     uuid references public.users (id) on delete set null,
  body          text not null check (length(trim(body)) between 1 and 20000),
  -- The single hard line for client visibility. Enforced in the SELECT policy.
  is_internal   boolean not null default false,
  edited_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  constraint comments_scoped check (project_id is not null or client_id is not null),
  constraint comments_no_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists comments_entity_idx
  on public.comments (entity_type, entity_id, created_at)
  where deleted_at is null;
create index if not exists comments_project_idx
  on public.comments (project_id, created_at desc)
  where deleted_at is null;
create index if not exists comments_parent_idx
  on public.comments (parent_id) where deleted_at is null;

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- --- approvals ---------------------------------------------------------------
-- Append-only record of approve / reject / request-changes decisions.
create table if not exists public.approvals (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.projects (id) on delete cascade,
  client_id        uuid references public.clients (id) on delete cascade,
  entity_type      text not null,
  entity_id        uuid not null,
  decision         public.approval_decision not null,
  reason           text,
  previous_status  text,
  new_status       text,
  decided_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  -- A reason is mandatory when rejecting or requesting changes.
  constraint approvals_reason_required check (
    decision = 'approved' or (reason is not null and length(trim(reason)) > 0)
  )
);

create index if not exists approvals_entity_idx
  on public.approvals (entity_type, entity_id, created_at desc);
create index if not exists approvals_project_idx
  on public.approvals (project_id, created_at desc);

-- ###########################################################################
-- 0006_change_and_support.sql
-- ###########################################################################
-- ===========================================================================
-- 0006  Change requests (with quote/approval round-trip) and support requests
-- ===========================================================================

create sequence if not exists public.change_request_reference_seq;
create sequence if not exists public.support_request_reference_seq;

-- --- change_requests ---------------------------------------------------------
create table if not exists public.change_requests (
  id                        uuid primary key default gen_random_uuid(),
  reference                 text not null unique
                              default 'CR-' || lpad(nextval('public.change_request_reference_seq')::text, 4, '0'),
  client_id                 uuid not null references public.clients (id) on delete cascade,
  project_id                uuid not null references public.projects (id) on delete cascade,
  subscription_id           uuid,  -- FK added in 0007
  title                     text not null check (length(trim(title)) between 1 and 300),
  category                  public.change_request_category not null default 'other',
  description               text not null check (length(trim(description)) > 0),
  affected_url              text,
  desired_outcome           text,
  priority                  public.task_priority not null default 'medium',
  status                    public.change_request_status not null default 'submitted',
  billing_treatment         public.billing_treatment,
  estimated_hours           numeric(6,2) check (estimated_hours is null or estimated_hours >= 0),
  estimated_cost            numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),
  estimated_completion_date date,
  assigned_to               uuid references public.users (id) on delete set null,
  submitted_by              uuid references public.users (id) on delete set null,
  submitted_at              timestamptz not null default now(),
  -- Agency-only notes live in public.internal_notes (migration 0015).
  client_notes              text,
  -- Effort actually spent, used to draw down the maintenance allowance.
  logged_minutes            integer not null default 0 check (logged_minutes >= 0),
  completed_at              timestamptz,
  rejected_reason           text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

create index if not exists change_requests_project_idx
  on public.change_requests (project_id, status)
  where deleted_at is null;
create index if not exists change_requests_client_idx
  on public.change_requests (client_id, status)
  where deleted_at is null;
create index if not exists change_requests_assigned_idx
  on public.change_requests (assigned_to)
  where deleted_at is null;
create index if not exists change_requests_open_idx
  on public.change_requests (submitted_at desc)
  where deleted_at is null
    and status not in ('completed', 'rejected', 'cancelled');

drop trigger if exists change_requests_set_updated_at on public.change_requests;
create trigger change_requests_set_updated_at
  before update on public.change_requests
  for each row execute function public.set_updated_at();

-- --- change_request_approvals ------------------------------------------------
-- One row per quote round, so the full approval history is preserved.
create table if not exists public.change_request_approvals (
  id                        uuid primary key default gen_random_uuid(),
  change_request_id         uuid not null references public.change_requests (id) on delete cascade,
  quoted_hours              numeric(6,2) check (quoted_hours is null or quoted_hours >= 0),
  quoted_cost               numeric(12,2) check (quoted_cost is null or quoted_cost >= 0),
  quote_notes               text,
  proposed_completion_date  date,
  billing_treatment         public.billing_treatment not null default 'requires_quotation',
  offered_by                uuid references public.users (id) on delete set null,
  offered_at                timestamptz not null default now(),
  decision                  public.quote_decision not null default 'pending',
  decided_by                uuid references public.users (id) on delete set null,
  decided_at                timestamptz,
  decision_notes            text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- Rejecting or asking for clarification requires an explanation.
  constraint cra_decision_notes_required check (
    decision in ('pending', 'approved')
    or (decision_notes is not null and length(trim(decision_notes)) > 0)
  )
);

create index if not exists cra_request_idx
  on public.change_request_approvals (change_request_id, offered_at desc);
create unique index if not exists cra_single_pending_idx
  on public.change_request_approvals (change_request_id)
  where decision = 'pending';

drop trigger if exists change_request_approvals_set_updated_at on public.change_request_approvals;
create trigger change_request_approvals_set_updated_at
  before update on public.change_request_approvals
  for each row execute function public.set_updated_at();

-- Deferred FK from 0005.
do $$ begin
  alter table public.files
    add constraint files_change_request_id_fkey
    foreign key (change_request_id) references public.change_requests (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- --- support_requests --------------------------------------------------------
create table if not exists public.support_requests (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique
                        default 'SR-' || lpad(nextval('public.support_request_reference_seq')::text, 4, '0'),
  client_id           uuid not null references public.clients (id) on delete cascade,
  project_id          uuid references public.projects (id) on delete set null,
  subscription_id     uuid,  -- FK added in 0007
  subject             text not null check (length(trim(subject)) between 1 and 300),
  category            public.support_category not null default 'general_support',
  description         text not null check (length(trim(description)) > 0),
  affected_url        text,
  urgency             public.urgency not null default 'normal',
  status              public.support_status not null default 'open',
  assigned_to         uuid references public.users (id) on delete set null,
  submitted_by        uuid references public.users (id) on delete set null,
  submitted_at        timestamptz not null default now(),
  -- Resolved at triage from the client's active subscription; shown in the portal.
  covered_by_plan     boolean,
  coverage_note       text,
  response_due_at     timestamptz,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  resolution_summary  text,
  time_spent_minutes  integer not null default 0 check (time_spent_minutes >= 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index if not exists support_requests_client_idx
  on public.support_requests (client_id, status)
  where deleted_at is null;
create index if not exists support_requests_project_idx
  on public.support_requests (project_id)
  where deleted_at is null;
create index if not exists support_requests_open_idx
  on public.support_requests (urgency, submitted_at desc)
  where deleted_at is null and status not in ('resolved', 'closed');

drop trigger if exists support_requests_set_updated_at on public.support_requests;
create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function public.set_updated_at();

-- Deferred FK from 0005.
do $$ begin
  alter table public.files
    add constraint files_support_request_id_fkey
    foreign key (support_request_id) references public.support_requests (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- ###########################################################################
-- 0007_maintenance.sql
-- ###########################################################################
-- ===========================================================================
-- 0007  Maintenance plans, subscriptions, usage, events, requests, reminders
-- ===========================================================================

-- --- maintenance_plans -------------------------------------------------------
-- Fully configurable. No tier is hard-coded anywhere in the application.
create table if not exists public.maintenance_plans (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  slug                      text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  description               text,
  monthly_price             numeric(12,2) check (monthly_price is null or monthly_price >= 0),
  annual_price              numeric(12,2) check (annual_price is null or annual_price >= 0),
  currency                  text not null default 'GBP' check (length(currency) = 3),
  included_services         text[] not null default '{}',
  included_change_minutes   integer not null default 0 check (included_change_minutes >= 0),
  included_support_minutes  integer not null default 0 check (included_support_minutes >= 0),
  response_time_hours       integer check (response_time_hours is null or response_time_hours > 0),
  priority_level            integer not null default 3 check (priority_level between 1 and 5),
  billing_frequency         public.billing_frequency not null default 'monthly',
  renewal_period_months     integer not null default 12 check (renewal_period_months > 0),
  is_active                 boolean not null default true,
  -- is_public controls whether clients can see the tier in the portal.
  is_public                 boolean not null default true,
  position                  integer not null default 0,
  created_by                uuid references public.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists maintenance_plans_active_idx
  on public.maintenance_plans (position)
  where is_active;

drop trigger if exists maintenance_plans_set_updated_at on public.maintenance_plans;
create trigger maintenance_plans_set_updated_at
  before update on public.maintenance_plans
  for each row execute function public.set_updated_at();

-- --- maintenance_subscriptions ----------------------------------------------
create table if not exists public.maintenance_subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references public.clients (id) on delete cascade,
  project_id                uuid references public.projects (id) on delete set null,
  -- RESTRICT: a plan with history must be deactivated, never deleted.
  plan_id                   uuid not null references public.maintenance_plans (id) on delete restrict,
  status                    public.subscription_status not null default 'active',
  website_url               text,
  start_date                date not null default current_date,
  renewal_date              date not null,
  end_date                  date,
  billing_cycle             public.billing_frequency not null default 'monthly',
  price                     numeric(12,2) not null default 0 check (price >= 0),
  currency                  text not null default 'GBP' check (length(currency) = 3),
  -- Allowances are snapshotted so editing a plan never rewrites past periods.
  included_change_minutes   integer not null default 0 check (included_change_minutes >= 0),
  included_support_minutes  integer not null default 0 check (included_support_minutes >= 0),
  auto_renew                boolean not null default true,
  created_by                uuid references public.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz,
  constraint subscriptions_renewal_after_start check (renewal_date >= start_date)
);

create index if not exists subscriptions_client_idx
  on public.maintenance_subscriptions (client_id)
  where deleted_at is null;
create index if not exists subscriptions_project_idx
  on public.maintenance_subscriptions (project_id)
  where deleted_at is null;
create index if not exists subscriptions_renewal_idx
  on public.maintenance_subscriptions (renewal_date)
  where deleted_at is null and status in ('trial', 'active', 'renewal_due');

drop trigger if exists maintenance_subscriptions_set_updated_at on public.maintenance_subscriptions;
create trigger maintenance_subscriptions_set_updated_at
  before update on public.maintenance_subscriptions
  for each row execute function public.set_updated_at();

-- Deferred FKs from 0006.
do $$ begin
  alter table public.change_requests
    add constraint change_requests_subscription_id_fkey
    foreign key (subscription_id) references public.maintenance_subscriptions (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.support_requests
    add constraint support_requests_subscription_id_fkey
    foreign key (subscription_id) references public.maintenance_subscriptions (id) on delete set null;
exception when duplicate_object then null; end $$;

-- --- maintenance_usage -------------------------------------------------------
-- Minutes, not decimal hours, so "1 hour 20 minutes" is exact.
create table if not exists public.maintenance_usage (
  id                    uuid primary key default gen_random_uuid(),
  subscription_id       uuid not null references public.maintenance_subscriptions (id) on delete cascade,
  client_id             uuid not null references public.clients (id) on delete cascade,
  period_start          date not null,
  period_end            date not null,
  usage_type            public.usage_type not null,
  minutes               integer not null,
  description           text not null,
  change_request_id     uuid references public.change_requests (id) on delete set null,
  support_request_id    uuid references public.support_requests (id) on delete set null,
  -- Agency users may correct recorded usage; corrections are always attributed.
  is_manual_adjustment  boolean not null default false,
  occurred_on           date not null default current_date,
  recorded_by           uuid references public.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  constraint usage_period_valid check (period_end >= period_start)
);

create index if not exists usage_subscription_period_idx
  on public.maintenance_usage (subscription_id, period_start desc);
create index if not exists usage_change_request_idx
  on public.maintenance_usage (change_request_id);
create index if not exists usage_support_request_idx
  on public.maintenance_usage (support_request_id);

comment on column public.maintenance_usage.minutes is
  'May be negative when correcting a previous over-recording (is_manual_adjustment = true).';

-- --- maintenance_events ------------------------------------------------------
-- Immutable subscription history.
create table if not exists public.maintenance_events (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.maintenance_subscriptions (id) on delete cascade,
  event_type       public.maintenance_event_type not null,
  from_plan_id     uuid references public.maintenance_plans (id) on delete set null,
  to_plan_id       uuid references public.maintenance_plans (id) on delete set null,
  effective_date   date not null default current_date,
  notes            text,
  actor_id         uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists maintenance_events_subscription_idx
  on public.maintenance_events (subscription_id, created_at desc);

-- --- maintenance_plan_requests -----------------------------------------------
-- Clients request; the agency decides. A subscription is never changed directly.
create table if not exists public.maintenance_plan_requests (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  subscription_id   uuid references public.maintenance_subscriptions (id) on delete cascade,
  requested_type    public.plan_request_type not null,
  requested_plan_id uuid references public.maintenance_plans (id) on delete set null,
  message           text,
  status            public.plan_request_status not null default 'pending',
  requested_by      uuid references public.users (id) on delete set null,
  reviewed_by       uuid references public.users (id) on delete set null,
  reviewed_at       timestamptz,
  response_notes    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists plan_requests_client_idx
  on public.maintenance_plan_requests (client_id, status);
create index if not exists plan_requests_pending_idx
  on public.maintenance_plan_requests (created_at desc)
  where status = 'pending';

drop trigger if exists maintenance_plan_requests_set_updated_at on public.maintenance_plan_requests;
create trigger maintenance_plan_requests_set_updated_at
  before update on public.maintenance_plan_requests
  for each row execute function public.set_updated_at();

-- --- renewal_reminders -------------------------------------------------------
create table if not exists public.renewal_reminders (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  subscription_id  uuid references public.maintenance_subscriptions (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete cascade,
  reminder_type    public.reminder_type not null,
  title            text not null,
  due_date         date not null,
  -- Days before due_date at which this reminder should surface.
  offsets          integer[] not null default '{60,30,14,7,0}',
  status           public.reminder_status not null default 'scheduled',
  assigned_to      uuid references public.users (id) on delete set null,
  notes            text,
  last_notified_at timestamptz,
  -- Highest offset already notified, so the sweep is idempotent.
  last_offset_sent integer,
  completed_at     timestamptz,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists reminders_due_idx
  on public.renewal_reminders (due_date)
  where status in ('scheduled', 'due');
create index if not exists reminders_client_idx
  on public.renewal_reminders (client_id);
create index if not exists reminders_subscription_idx
  on public.renewal_reminders (subscription_id);

drop trigger if exists renewal_reminders_set_updated_at on public.renewal_reminders;
create trigger renewal_reminders_set_updated_at
  before update on public.renewal_reminders
  for each row execute function public.set_updated_at();

-- ###########################################################################
-- 0008_handover.sql
-- ###########################################################################
-- ===========================================================================
-- 0008  Website handover, checklists, documents, formal client acceptance
-- ===========================================================================

-- --- handovers (1:1 with project) -------------------------------------------
-- Technical reference material for the finished website.
-- NOTE: no credential columns exist by design. Passwords are never stored here.
create table if not exists public.handovers (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null unique references public.projects (id) on delete cascade,
  status                  public.handover_status not null default 'draft',
  website_url             text,
  admin_url               text,
  cms_platform            text,
  hosting_provider        text,
  hosting_notes           text,
  domain_registrar        text,
  domain_expiry           date,
  dns_provider            text,
  ssl_provider            text,
  ssl_expiry              date,
  analytics_notes         text,
  search_console_notes    text,
  backup_notes            text,
  security_notes          text,
  third_party_services    jsonb not null default '[]'::jsonb,
  licence_notes           text,
  documentation_notes     text,
  training_notes          text,
  maintenance_notes       text,
  prepared_by             uuid references public.users (id) on delete set null,
  delivered_at            timestamptz,
  delivered_by            uuid references public.users (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

drop trigger if exists handovers_set_updated_at on public.handovers;
create trigger handovers_set_updated_at
  before update on public.handovers
  for each row execute function public.set_updated_at();

comment on table public.handovers is
  'Handover reference data. Credentials are deliberately absent — they are shared '
  'through the agency''s secure credential-sharing process, never stored in this system.';

-- --- handover_checklists -----------------------------------------------------
create table if not exists public.handover_checklists (
  id           uuid primary key default gen_random_uuid(),
  handover_id  uuid not null references public.handovers (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  name         text not null default 'Launch checklist',
  description  text,
  position     integer not null default 0,
  created_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists handover_checklists_handover_idx
  on public.handover_checklists (handover_id, position);

drop trigger if exists handover_checklists_set_updated_at on public.handover_checklists;
create trigger handover_checklists_set_updated_at
  before update on public.handover_checklists
  for each row execute function public.set_updated_at();

-- --- handover_items ----------------------------------------------------------
create table if not exists public.handover_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.handover_checklists (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  title         text not null,
  description   text,
  status        public.handover_item_status not null default 'pending',
  position      integer not null default 0,
  notes         text,
  completed_by  uuid references public.users (id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists handover_items_checklist_idx
  on public.handover_items (checklist_id, position);
create index if not exists handover_items_project_idx
  on public.handover_items (project_id);

drop trigger if exists handover_items_set_updated_at on public.handover_items;
create trigger handover_items_set_updated_at
  before update on public.handover_items
  for each row execute function public.set_updated_at();

-- --- handover_documents ------------------------------------------------------
-- Stays available to the client indefinitely after project completion.
create table if not exists public.handover_documents (
  id                 uuid primary key default gen_random_uuid(),
  handover_id        uuid not null references public.handovers (id) on delete cascade,
  project_id         uuid not null references public.projects (id) on delete cascade,
  file_id            uuid references public.files (id) on delete set null,
  title              text not null,
  doc_type           text not null default 'documentation'
                       check (doc_type in ('user_guide','training_video','documentation',
                                           'brand_guidelines','technical','maintenance',
                                           'backup_instructions','cms_guide','other')),
  description        text,
  external_url       text,
  visible_to_client  boolean not null default true,
  position           integer not null default 0,
  created_by         uuid references public.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- A document is either an uploaded file or an external link.
  constraint handover_documents_has_target check (file_id is not null or external_url is not null)
);

create index if not exists handover_documents_handover_idx
  on public.handover_documents (handover_id, position);
create index if not exists handover_documents_project_idx
  on public.handover_documents (project_id);

drop trigger if exists handover_documents_set_updated_at on public.handover_documents;
create trigger handover_documents_set_updated_at
  before update on public.handover_documents
  for each row execute function public.set_updated_at();

-- --- client_acceptances ------------------------------------------------------
-- Append-only formal sign-off. Part of the permanent audit history.
create table if not exists public.client_acceptances (
  id                            uuid primary key default gen_random_uuid(),
  project_id                    uuid not null references public.projects (id) on delete cascade,
  handover_id                   uuid references public.handovers (id) on delete set null,
  approved_by                   uuid references public.users (id) on delete set null,
  approved_by_name              text not null,
  accepted_at                   timestamptz not null default now(),
  project_version               text,
  statement                     text not null,
  website_reviewed              boolean not null default false,
  requested_changes_completed   boolean not null default false,
  approved_for_launch           boolean not null default false,
  handover_materials_received   boolean not null default false,
  training_received             boolean not null default false,
  training_not_applicable       boolean not null default false,
  maintenance_understood        boolean not null default false,
  signature_name                text not null,
  ip_address                    inet,
  user_agent                    text,
  created_at                    timestamptz not null default now(),
  -- Every confirmation must be affirmative for the record to exist.
  constraint client_acceptances_all_confirmed check (
    website_reviewed
    and requested_changes_completed
    and approved_for_launch
    and handover_materials_received
    and maintenance_understood
    and (training_received or training_not_applicable)
  )
);

create index if not exists client_acceptances_project_idx
  on public.client_acceptances (project_id, accepted_at desc);

-- --- handover_template_items -------------------------------------------------
-- The default checklist new handovers are instantiated from. Agency-editable,
-- so "customise the checklist" is a data change rather than a code change.
create table if not exists public.handover_template_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  position     integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists handover_template_items_position_idx
  on public.handover_template_items (position) where is_active;

drop trigger if exists handover_template_items_set_updated_at on public.handover_template_items;
create trigger handover_template_items_set_updated_at
  before update on public.handover_template_items
  for each row execute function public.set_updated_at();

-- ###########################################################################
-- 0009_system.sql
-- ###########################################################################
-- ===========================================================================
-- 0009  Notifications, activity feed, audit log
-- ===========================================================================

-- --- notifications -----------------------------------------------------------
-- In-app only for now. `delivered_email_at` is present so an email transport
-- can be layered on later without a migration.
create table if not exists public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users (id) on delete cascade,
  type               public.notification_type not null,
  title              text not null,
  body               text,
  url                text,
  entity_type        text,
  entity_id          uuid,
  project_id         uuid references public.projects (id) on delete cascade,
  client_id          uuid references public.clients (id) on delete cascade,
  actor_id           uuid references public.users (id) on delete set null,
  is_read            boolean not null default false,
  read_at            timestamptz,
  delivered_email_at timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where not is_read;
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- --- activity_logs -----------------------------------------------------------
-- The chronological project feed and the per-request timeline. Never deleted.
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.projects (id) on delete cascade,
  client_id    uuid references public.clients (id) on delete cascade,
  actor_id     uuid references public.users (id) on delete set null,
  -- Actor name is denormalised so history survives account removal.
  actor_name   text,
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  summary      text not null,
  metadata     jsonb not null default '{}'::jsonb,
  visibility   public.activity_visibility not null default 'internal',
  created_at   timestamptz not null default now()
);

create index if not exists activity_project_idx
  on public.activity_logs (project_id, created_at desc);
create index if not exists activity_client_idx
  on public.activity_logs (client_id, created_at desc);
create index if not exists activity_entity_idx
  on public.activity_logs (entity_type, entity_id, created_at desc);

-- --- audit_logs --------------------------------------------------------------
-- Insert-only. No UPDATE or DELETE policy is ever created for this table,
-- so not even an agency admin can rewrite the record through PostgREST.
create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid references public.users (id) on delete set null,
  actor_email     text,
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  previous_value  jsonb,
  new_value       jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index if not exists audit_entity_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_actor_idx
  on public.audit_logs (actor_id, created_at desc);
create index if not exists audit_created_idx
  on public.audit_logs (created_at desc);

comment on table public.audit_logs is
  'Append-only. Deliberately has no UPDATE or DELETE RLS policy.';

-- ###########################################################################
-- 0010_functions.sql
-- ###########################################################################
-- ===========================================================================
-- 0010  Permission predicates, account provisioning, progress + usage maths
-- ===========================================================================
-- Every predicate below is SECURITY DEFINER with a pinned search_path so it can
-- read public.users without recursing into the RLS policies it powers.

-- --------------------------------------------------------------------------
-- Permission predicates
-- --------------------------------------------------------------------------

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.is_active
    and u.deleted_at is null;
$$;

create or replace function public.current_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.organisation_id
  from public.users u
  where u.id = auth.uid()
    and u.is_active
    and u.deleted_at is null;
$$;

create or replace function public.is_agency()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role::text not in ('client_owner', 'client_member')
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

create or replace function public.is_agency_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role::text = 'agency_admin'
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

-- Admins and project managers see the whole book of work.
create or replace function public.is_agency_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role::text in ('agency_admin', 'project_manager')
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role::text in ('client_owner', 'client_member')
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

-- The client record belonging to the caller's organisation. NULL for agency users.
-- True when there is no end-user session: a service-role connection or direct
-- SQL. Such callers already bypass RLS, so the column guards must not fight
-- them; this keeps seeding and server-side admin work possible without
-- weakening anything a real user can reach.
create or replace function public.is_service_context()
returns boolean
language sql
stable
as $$
  -- Both halves matter: PostgREST always connects as `authenticated` or `anon`,
  -- so requiring a different connection role means a browser session can never
  -- reach this branch even if it presents no user id.
  select auth.uid() is null
     and current_user not in ('authenticated', 'anon');
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.users u
  join public.clients c on c.organisation_id = u.organisation_id
  where u.id = auth.uid()
    and u.is_active
    and u.deleted_at is null
    and u.role::text in ('client_owner', 'client_member')
    and c.deleted_at is null;
$$;

create or replace function public.can_access_client(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_client_id is not null
    and (
      public.is_agency_manager()
      -- Account manager for this client
      or exists (
        select 1 from public.clients c
        where c.id = p_client_id and c.account_manager_id = auth.uid()
      )
      -- Agency member of at least one of this client's projects
      or exists (
        select 1
        from public.project_members pm
        join public.projects p on p.id = pm.project_id
        where pm.user_id = auth.uid() and p.client_id = p_client_id
      )
      -- The client's own people
      or p_client_id = public.current_client_id()
    );
$$;

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_project_id is not null
    and (
      public.is_agency_manager()
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p_project_id and pm.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.projects p
        join public.clients c on c.id = p.client_id
        where p.id = p_project_id and c.account_manager_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        where p.id = p_project_id and p.client_id = public.current_client_id()
      )
    );
$$;

-- Write access is agency-only; clients mutate through narrowly scoped policies.
create or replace function public.can_edit_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_agency()
    and (
      public.is_agency_manager()
      or exists (
        select 1 from public.project_members pm
        where pm.project_id = p_project_id
          and pm.user_id = auth.uid()
          and pm.can_edit
      )
      or exists (
        select 1
        from public.projects p
        join public.clients c on c.id = p.client_id
        where p.id = p_project_id and c.account_manager_id = auth.uid()
      )
    );
$$;

-- --------------------------------------------------------------------------
-- Account provisioning — invite-only
-- --------------------------------------------------------------------------
-- Runs when Supabase Auth creates a user. Consumes the matching pending
-- invitation. With no invitation the profile is created INACTIVE and with no
-- organisation, so it can see nothing at all.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invitations%rowtype;
  v_name   text;
begin
  select * into v_invite
  from public.invitations
  where email = new.email
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(v_invite.full_name), ''),
    split_part(new.email, '@', 1)
  );

  if v_invite.id is not null then
    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, v_name, v_invite.role, v_invite.organisation_id, true)
    on conflict (id) do update
      set role            = excluded.role,
          organisation_id = excluded.organisation_id,
          is_active       = true;

    update public.invitations
    set accepted_at = now()
    where id = v_invite.id;

    -- Adopt the invited person as the client's primary contact if none is set.
    if v_invite.client_id is not null then
      update public.clients
      set primary_contact_name = coalesce(nullif(trim(primary_contact_name), ''), v_name),
          email                = coalesce(email, new.email)
      where id = v_invite.client_id;
    end if;
  else
    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, v_name, 'client_member', null, false)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------------------
-- Audit logging helper
-- --------------------------------------------------------------------------
-- audit_logs has no INSERT policy; this definer function is the only way in.
create or replace function public.record_audit(
  p_action          text,
  p_entity_type     text,
  p_entity_id       uuid,
  p_previous_value  jsonb default null,
  p_new_value       jsonb default null,
  p_ip_address      text  default null,
  p_user_agent      text  default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'record_audit requires an authenticated session';
  end if;

  select email into v_email from public.users where id = auth.uid();

  insert into public.audit_logs (
    actor_id, actor_email, action, entity_type, entity_id,
    previous_value, new_value, ip_address, user_agent
  )
  values (
    auth.uid(), v_email, p_action, p_entity_type, p_entity_id,
    p_previous_value, p_new_value,
    nullif(p_ip_address, '')::inet, p_user_agent
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- --------------------------------------------------------------------------
-- Maintenance period + usage maths
-- --------------------------------------------------------------------------
-- Billing periods are anchored to the subscription start date, so a
-- subscription starting on the 9th runs 9th-to-8th, not calendar months.
create or replace function public.subscription_period(
  p_subscription_id uuid,
  p_on date default current_date
)
returns table (period_start date, period_end date)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start     date;
  v_cycle     public.billing_frequency;
  v_months    integer;
  v_elapsed   integer;
  v_periods   integer;
begin
  select s.start_date, s.billing_cycle into v_start, v_cycle
  from public.maintenance_subscriptions s
  where s.id = p_subscription_id;

  if v_start is null then
    return;
  end if;

  v_months := case v_cycle
                when 'monthly' then 1
                when 'quarterly' then 3
                else 12
              end;

  if p_on < v_start then
    period_start := v_start;
    period_end   := (v_start + make_interval(months => v_months) - interval '1 day')::date;
    return next;
    return;
  end if;

  v_elapsed := (extract(year from age(p_on, v_start)) * 12
                + extract(month from age(p_on, v_start)))::integer;
  v_periods := v_elapsed / v_months;

  period_start := (v_start + make_interval(months => v_periods * v_months))::date;
  period_end   := (period_start + make_interval(months => v_months) - interval '1 day')::date;
  return next;
end;
$$;

-- Minutes consumed in the period containing p_on, split by usage type.
create or replace function public.subscription_usage(
  p_subscription_id uuid,
  p_on date default current_date
)
returns table (
  period_start    date,
  period_end      date,
  change_minutes  integer,
  support_minutes integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end   date;
begin
  select sp.period_start, sp.period_end into v_start, v_end
  from public.subscription_period(p_subscription_id, p_on) sp;

  if v_start is null then
    return;
  end if;

  period_start := v_start;
  period_end   := v_end;

  select
    coalesce(sum(u.minutes) filter (where u.usage_type = 'change'), 0),
    coalesce(sum(u.minutes) filter (where u.usage_type = 'support'), 0)
  into change_minutes, support_minutes
  from public.maintenance_usage u
  where u.subscription_id = p_subscription_id
    and u.occurred_on between v_start and v_end;

  return next;
end;
$$;

-- --------------------------------------------------------------------------
-- Progress calculation
-- --------------------------------------------------------------------------
-- Returns the per-component breakdown plus a weighted overall figure.
-- Sections marked "not required" are excluded from the onboarding denominator,
-- exactly as specified. A component with nothing to measure returns NULL and is
-- dropped from the weighted average rather than counting as zero.
create or replace function public.calculate_project_progress(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_onboarding  numeric;
  v_planning    numeric;
  v_content     numeric;
  v_design      numeric;
  v_development numeric;
  v_qa          numeric;
  v_handover    numeric;
  v_total       numeric := 0;
  v_weight      numeric := 0;
begin
  -- Onboarding: approved (or not required) sections over required sections.
  select case
           when count(*) filter (where status <> 'not_required') = 0 then null
           else round(
             100.0 * count(*) filter (where status = 'approved')
             / count(*) filter (where status <> 'not_required'), 0)
         end
  into v_onboarding
  from public.onboarding_sections
  where project_id = p_project_id;

  -- Planning: completed milestones.
  select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where completed_at is not null) / count(*), 0)
         end
  into v_planning
  from public.project_milestones
  where project_id = p_project_id;

  -- Content: approved website pages.
  select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where status = 'approved') / count(*), 0)
         end
  into v_content
  from public.website_pages
  where project_id = p_project_id and deleted_at is null;

  -- Task-driven components.
  select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where status = 'complete') / count(*), 0)
         end
  into v_design
  from public.tasks
  where project_id = p_project_id and deleted_at is null and work_stream = 'design';

  select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where status = 'complete') / count(*), 0)
         end
  into v_development
  from public.tasks
  where project_id = p_project_id and deleted_at is null and work_stream = 'development';

  select case when count(*) = 0 then null
              else round(100.0 * count(*) filter (where status = 'complete') / count(*), 0)
         end
  into v_qa
  from public.tasks
  where project_id = p_project_id and deleted_at is null and work_stream = 'qa';

  -- Handover: applicable checklist items that are complete.
  select case
           when count(*) filter (where status <> 'not_applicable') = 0 then null
           else round(
             100.0 * count(*) filter (where status = 'complete')
             / count(*) filter (where status <> 'not_applicable'), 0)
         end
  into v_handover
  from public.handover_items
  where project_id = p_project_id;

  -- Weighted average across whichever components exist.
  if v_onboarding  is not null then v_total := v_total + v_onboarding  * 15; v_weight := v_weight + 15; end if;
  if v_planning    is not null then v_total := v_total + v_planning    * 10; v_weight := v_weight + 10; end if;
  if v_content     is not null then v_total := v_total + v_content     * 15; v_weight := v_weight + 15; end if;
  if v_design      is not null then v_total := v_total + v_design      * 15; v_weight := v_weight + 15; end if;
  if v_development is not null then v_total := v_total + v_development * 25; v_weight := v_weight + 25; end if;
  if v_qa          is not null then v_total := v_total + v_qa          * 10; v_weight := v_weight + 10; end if;
  if v_handover    is not null then v_total := v_total + v_handover    * 10; v_weight := v_weight + 10; end if;

  return jsonb_build_object(
    'onboarding',  v_onboarding,
    'planning',    v_planning,
    'content',     v_content,
    'design',      v_design,
    'development', v_development,
    'qa',          v_qa,
    'handover',    v_handover,
    'overall',     case when v_weight = 0 then 0 else round(v_total / v_weight, 0) end
  );
end;
$$;

create or replace function public.recalculate_project_completion(p_project_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_overall integer;
begin
  v_overall := coalesce(
    (public.calculate_project_progress(p_project_id) ->> 'overall')::integer, 0
  );

  update public.projects
  set completion_percentage = v_overall
  where id = p_project_id
    and completion_percentage is distinct from v_overall;

  return v_overall;
end;
$$;

-- Keep completion_percentage current whenever contributing rows change.
create or replace function public.trigger_recalculate_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  v_project_id := case when tg_op = 'DELETE' then old.project_id else new.project_id end;

  if v_project_id is not null then
    perform public.recalculate_project_completion(v_project_id);
  end if;

  return null;  -- AFTER trigger
end;
$$;

drop trigger if exists onboarding_sections_progress on public.onboarding_sections;
create trigger onboarding_sections_progress
  after insert or update of status or delete on public.onboarding_sections
  for each row execute function public.trigger_recalculate_progress();

drop trigger if exists project_milestones_progress on public.project_milestones;
create trigger project_milestones_progress
  after insert or update of completed_at or delete on public.project_milestones
  for each row execute function public.trigger_recalculate_progress();

drop trigger if exists website_pages_progress on public.website_pages;
create trigger website_pages_progress
  after insert or update of status, deleted_at or delete on public.website_pages
  for each row execute function public.trigger_recalculate_progress();

drop trigger if exists tasks_progress on public.tasks;
create trigger tasks_progress
  after insert or update of status, work_stream, deleted_at or delete on public.tasks
  for each row execute function public.trigger_recalculate_progress();

drop trigger if exists handover_items_progress on public.handover_items;
create trigger handover_items_progress
  after insert or update of status or delete on public.handover_items
  for each row execute function public.trigger_recalculate_progress();

-- --------------------------------------------------------------------------
-- Task completion bookkeeping
-- --------------------------------------------------------------------------
create or replace function public.stamp_task_completion()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'complete' and (old.status is distinct from 'complete') then
    new.completed_at := coalesce(new.completed_at, now());
    new.completed_by := coalesce(new.completed_by, auth.uid());
  elsif new.status <> 'complete' then
    new.completed_at := null;
    new.completed_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_stamp_completion on public.tasks;
create trigger tasks_stamp_completion
  before update on public.tasks
  for each row execute function public.stamp_task_completion();

-- --------------------------------------------------------------------------
-- Subscription status maintenance + reminder sweep
-- --------------------------------------------------------------------------
-- Idempotent: safe to call repeatedly from a cron job or on dashboard load.
create or replace function public.sweep_maintenance_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_renewal_due integer := 0;
  v_expired     integer := 0;
  v_due         integer := 0;
begin
  -- Active subscriptions inside the 30-day renewal window.
  with updated as (
    update public.maintenance_subscriptions
    set status = 'renewal_due'
    where deleted_at is null
      and status = 'active'
      and renewal_date <= current_date + 30
      and renewal_date >= current_date
    returning 1
  )
  select count(*) into v_renewal_due from updated;

  -- Past renewal date and not set to auto-renew.
  with updated as (
    update public.maintenance_subscriptions
    set status = 'expired'
    where deleted_at is null
      and status in ('active', 'renewal_due', 'trial')
      and renewal_date < current_date
      and not auto_renew
    returning 1
  )
  select count(*) into v_expired from updated;

  -- Reminders whose earliest offset has been reached.
  with updated as (
    update public.renewal_reminders r
    set status = 'due'
    where r.status = 'scheduled'
      and r.due_date - (select max(o) from unnest(r.offsets) o) <= current_date
    returning 1
  )
  select count(*) into v_due from updated;

  return jsonb_build_object(
    'renewal_due', v_renewal_due,
    'expired', v_expired,
    'reminders_due', v_due
  );
end;
$$;

-- ###########################################################################
-- 0011_rls.sql
-- ###########################################################################
-- ===========================================================================
-- 0011  Row Level Security
-- ===========================================================================
-- RLS is the security boundary. The UI hides what a user cannot do; the
-- database refuses it. Every table below has RLS enabled AND forced, so even
-- the table owner goes through policies.

do $$
declare t text;
begin
  foreach t in array array[
    'organisations','users','agency_settings','invitations','clients',
    'lifecycle_stages','projects','project_members','project_plans',
    'project_deliverables','project_risks','project_milestones',
    'onboarding_templates','onboarding_template_sections','onboarding_sections',
    'onboarding_items','website_pages','integrations','files','tasks','comments',
    'approvals','change_requests','change_request_approvals','support_requests',
    'maintenance_plans','maintenance_subscriptions','maintenance_usage',
    'maintenance_events','maintenance_plan_requests','renewal_reminders',
    'handovers','handover_checklists','handover_items','handover_documents',
    'client_acceptances','handover_template_items','notifications',
    'activity_logs','audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

drop policy if exists organisations_select on public.organisations;
create policy organisations_select on public.organisations
  for select to authenticated
  using (public.is_agency() or id = public.current_organisation_id());

drop policy if exists organisations_write on public.organisations;
create policy organisations_write on public.organisations
  for all to authenticated
  using (public.is_agency_manager())
  with check (public.is_agency_manager());

-- A user always sees themselves; agency users see all staff and client contacts
-- they can reach; client users see colleagues in their own organisation only.
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_agency()
    or (organisation_id is not null and organisation_id = public.current_organisation_id())
  );

-- Self-service profile edits. Role and organisation changes are blocked here by
-- the companion trigger below; only an admin may alter those columns.
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists users_admin_write on public.users;
create policy users_admin_write on public.users
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

-- Guard rail: privilege escalation is impossible even with a crafted PATCH.
create or replace function public.guard_user_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.organisation_id is distinct from old.organisation_id
     or new.is_active is distinct from old.is_active then
    raise exception 'Only an agency administrator may change role, organisation or active status';
  end if;

  return new;
end;
$$;

drop trigger if exists users_guard_privileges on public.users;
create trigger users_guard_privileges
  before update on public.users
  for each row execute function public.guard_user_privileges();

drop policy if exists agency_settings_select on public.agency_settings;
create policy agency_settings_select on public.agency_settings
  for select to authenticated using (true);

drop policy if exists agency_settings_write on public.agency_settings;
create policy agency_settings_write on public.agency_settings
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

-- Agency admins manage all invitations; a client_owner may invite colleagues
-- into their own organisation only, and only with client roles.
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select to authenticated
  using (
    public.is_agency()
    or organisation_id = public.current_organisation_id()
  );

drop policy if exists invitations_agency_write on public.invitations;
create policy invitations_agency_write on public.invitations
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

drop policy if exists invitations_client_owner_insert on public.invitations;
create policy invitations_client_owner_insert on public.invitations
  for insert to authenticated
  with check (
    public.current_app_role()::text = 'client_owner'
    and organisation_id = public.current_organisation_id()
    and role::text in ('client_owner', 'client_member')
  );

drop policy if exists invitations_client_owner_revoke on public.invitations;
create policy invitations_client_owner_revoke on public.invitations
  for update to authenticated
  using (
    public.current_app_role()::text = 'client_owner'
    and organisation_id = public.current_organisation_id()
  )
  with check (
    public.current_app_role()::text = 'client_owner'
    and organisation_id = public.current_organisation_id()
    and role::text in ('client_owner', 'client_member')
  );

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (deleted_at is null and public.can_access_client(id));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_agency_manager());

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (public.is_agency() and public.can_access_client(id))
  with check (public.is_agency() and public.can_access_client(id));

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_agency_admin());

-- ---------------------------------------------------------------------------
-- Lifecycle + projects
-- ---------------------------------------------------------------------------

drop policy if exists lifecycle_stages_select on public.lifecycle_stages;
create policy lifecycle_stages_select on public.lifecycle_stages
  for select to authenticated using (true);

drop policy if exists lifecycle_stages_write on public.lifecycle_stages;
create policy lifecycle_stages_write on public.lifecycle_stages
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated
  using (deleted_at is null and public.can_access_project(id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_agency() and public.can_access_client(client_id));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
  for update to authenticated
  using (public.can_edit_project(id))
  with check (public.can_edit_project(id));

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_agency_admin());

drop policy if exists project_members_select on public.project_members;
create policy project_members_select on public.project_members
  for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists project_members_write on public.project_members;
create policy project_members_write on public.project_members
  for all to authenticated
  using (public.is_agency_manager() or public.can_edit_project(project_id))
  with check (public.is_agency_manager() or public.can_edit_project(project_id));

-- ---------------------------------------------------------------------------
-- Project-scoped agency-managed tables
-- Shared shape: read = can_access_project, write = can_edit_project.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'project_plans','project_deliverables','project_risks','project_milestones',
    'integrations','handovers','handover_checklists','handover_items',
    'handover_documents'
  ]
  loop
    execute format('drop policy if exists %1$s_select on public.%1$I', t);
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated
        using (public.can_access_project(project_id));
    $f$, t);

    execute format('drop policy if exists %1$s_write on public.%1$I', t);
    execute format($f$
      create policy %1$s_write on public.%1$I
        for all to authenticated
        using (public.can_edit_project(project_id))
        with check (public.can_edit_project(project_id));
    $f$, t);
  end loop;
end $$;

-- handovers/checklists carry project_id too, so the loop above covers them.

-- ---------------------------------------------------------------------------
-- Onboarding
-- ---------------------------------------------------------------------------

drop policy if exists onboarding_templates_select on public.onboarding_templates;
create policy onboarding_templates_select on public.onboarding_templates
  for select to authenticated using (public.is_agency());

drop policy if exists onboarding_templates_write on public.onboarding_templates;
create policy onboarding_templates_write on public.onboarding_templates
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

drop policy if exists onboarding_template_sections_select on public.onboarding_template_sections;
create policy onboarding_template_sections_select on public.onboarding_template_sections
  for select to authenticated using (public.is_agency());

drop policy if exists onboarding_template_sections_write on public.onboarding_template_sections;
create policy onboarding_template_sections_write on public.onboarding_template_sections
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

drop policy if exists onboarding_sections_select on public.onboarding_sections;
create policy onboarding_sections_select on public.onboarding_sections
  for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists onboarding_sections_agency_write on public.onboarding_sections;
create policy onboarding_sections_agency_write on public.onboarding_sections
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- A client may fill in their own project's sections, but only while the section
-- is still theirs to edit — never once it is submitted or approved.
drop policy if exists onboarding_sections_client_update on public.onboarding_sections;
create policy onboarding_sections_client_update on public.onboarding_sections
  for update to authenticated
  using (
    public.is_client()
    and public.can_access_project(project_id)
    and status in ('not_started', 'in_progress', 'needs_changes')
  )
  with check (
    public.is_client()
    and public.can_access_project(project_id)
    and status in ('in_progress', 'submitted')
  );

drop policy if exists onboarding_items_select on public.onboarding_items;
create policy onboarding_items_select on public.onboarding_items
  for select to authenticated
  using (public.can_access_project(project_id));

drop policy if exists onboarding_items_agency_write on public.onboarding_items;
create policy onboarding_items_agency_write on public.onboarding_items
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

drop policy if exists onboarding_items_client_update on public.onboarding_items;
create policy onboarding_items_client_update on public.onboarding_items
  for update to authenticated
  using (
    public.is_client()
    and public.can_access_project(project_id)
    and status in ('not_started', 'in_progress', 'needs_changes')
  )
  with check (
    public.is_client()
    and public.can_access_project(project_id)
    and status in ('in_progress', 'submitted')
  );

-- ---------------------------------------------------------------------------
-- Website content
-- ---------------------------------------------------------------------------

drop policy if exists website_pages_select on public.website_pages;
create policy website_pages_select on public.website_pages
  for select to authenticated
  using (deleted_at is null and public.can_access_project(project_id));

drop policy if exists website_pages_agency_write on public.website_pages;
create policy website_pages_agency_write on public.website_pages
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- Clients submit and revise page content until it is approved.
drop policy if exists website_pages_client_update on public.website_pages;
create policy website_pages_client_update on public.website_pages
  for update to authenticated
  using (
    public.is_client()
    and public.can_access_project(project_id)
    and status in ('draft', 'needs_changes')
  )
  with check (
    public.is_client()
    and public.can_access_project(project_id)
    and status in ('draft', 'submitted')
  );

-- ---------------------------------------------------------------------------
-- Files
-- ---------------------------------------------------------------------------

drop policy if exists files_select on public.files;
create policy files_select on public.files
  for select to authenticated
  using (
    deleted_at is null
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and public.can_access_client(client_id))
    )
    -- Internal-only attachments never reach the client.
    and (public.is_agency() or is_client_visible)
  );

drop policy if exists files_insert on public.files;
create policy files_insert on public.files
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and public.can_access_client(client_id))
    )
    -- A client cannot create a hidden file, nor pre-approve their own upload.
    and (public.is_agency() or (is_client_visible and approval_status = 'pending'))
  );

drop policy if exists files_agency_update on public.files;
create policy files_agency_update on public.files
  for update to authenticated
  using (project_id is not null and public.can_edit_project(project_id))
  with check (project_id is not null and public.can_edit_project(project_id));

drop policy if exists files_owner_update on public.files;
create policy files_owner_update on public.files
  for update to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

drop policy if exists files_delete on public.files;
create policy files_delete on public.files
  for delete to authenticated
  using (public.is_agency_manager());

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    deleted_at is null
    and public.can_access_project(project_id)
    and (public.is_agency() or is_client_visible)
  );

drop policy if exists tasks_agency_write on public.tasks;
create policy tasks_agency_write on public.tasks
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- Clients may progress tasks that are explicitly their responsibility.
drop policy if exists tasks_client_update on public.tasks;
create policy tasks_client_update on public.tasks
  for update to authenticated
  using (
    public.is_client()
    and public.can_access_project(project_id)
    and responsibility = 'client'
    and is_client_visible
  )
  with check (
    public.is_client()
    and public.can_access_project(project_id)
    and responsibility = 'client'
  );

-- ---------------------------------------------------------------------------
-- Comments — internal notes are invisible to clients at the database level
-- ---------------------------------------------------------------------------

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select to authenticated
  using (
    deleted_at is null
    and (public.is_agency() or not is_internal)
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and public.can_access_client(client_id))
    )
  );

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    -- Only agency users can write an internal note.
    and (public.is_agency() or not is_internal)
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and public.can_access_client(client_id))
    )
  );

drop policy if exists comments_author_update on public.comments;
create policy comments_author_update on public.comments
  for update to authenticated
  using (author_id = auth.uid() and deleted_at is null)
  with check (author_id = auth.uid() and (public.is_agency() or not is_internal));

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_agency_admin());

-- ---------------------------------------------------------------------------
-- Approvals (append-only)
-- ---------------------------------------------------------------------------

drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals
  for select to authenticated
  using (
    (project_id is not null and public.can_access_project(project_id))
    or (project_id is null and public.can_access_client(client_id))
  );

drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals
  for insert to authenticated
  with check (
    decided_by = auth.uid()
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and public.can_access_client(client_id))
    )
  );
-- No UPDATE or DELETE policy: approval history is immutable.

-- ---------------------------------------------------------------------------
-- Change requests
-- ---------------------------------------------------------------------------

drop policy if exists change_requests_select on public.change_requests;
create policy change_requests_select on public.change_requests
  for select to authenticated
  using (deleted_at is null and public.can_access_project(project_id));

drop policy if exists change_requests_client_insert on public.change_requests;
create policy change_requests_client_insert on public.change_requests
  for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and submitted_by = auth.uid()
    and (
      public.is_agency()
      -- A client may only raise a request against their own project, in the
      -- initial state, and may not set any of the commercial fields.
      or (
        client_id = public.current_client_id()
        and status = 'submitted'
        and billing_treatment is null
        and estimated_hours is null
        and estimated_cost is null
        and assigned_to is null
      )
    )
  );

drop policy if exists change_requests_agency_update on public.change_requests;
create policy change_requests_agency_update on public.change_requests
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- Clients act on their own request at the points the workflow gives them:
-- correcting it before triage, answering a request for more information,
-- deciding on a quotation, and accepting the finished work.
--
-- RLS decides WHICH ROWS; which STATE TRANSITIONS are legal is enforced by
-- guard_change_request_transition() in migration 0012, because a policy sees
-- either the old row (USING) or the new row (WITH CHECK) but never both, so it
-- cannot express "from this state to that state".
drop policy if exists change_requests_client_update on public.change_requests;
create policy change_requests_client_update on public.change_requests
  for update to authenticated
  using (
    public.is_client()
    and client_id = public.current_client_id()
    and status in (
      'submitted', 'more_information_required', 'awaiting_client_approval', 'client_review'
    )
  )
  with check (
    public.is_client()
    and client_id = public.current_client_id()
  );

drop policy if exists cra_select on public.change_request_approvals;
create policy cra_select on public.change_request_approvals
  for select to authenticated
  using (exists (
    select 1 from public.change_requests cr
    where cr.id = change_request_id and public.can_access_project(cr.project_id)
  ));

drop policy if exists cra_agency_write on public.change_request_approvals;
create policy cra_agency_write on public.change_request_approvals
  for all to authenticated
  using (exists (
    select 1 from public.change_requests cr
    where cr.id = change_request_id and public.can_edit_project(cr.project_id)
  ))
  with check (exists (
    select 1 from public.change_requests cr
    where cr.id = change_request_id and public.can_edit_project(cr.project_id)
  ));

-- The client's decision on a quote: they may only move a pending offer.
drop policy if exists cra_client_decide on public.change_request_approvals;
create policy cra_client_decide on public.change_request_approvals
  for update to authenticated
  using (
    public.is_client()
    and decision = 'pending'
    and exists (
      select 1 from public.change_requests cr
      where cr.id = change_request_id and cr.client_id = public.current_client_id()
    )
  )
  with check (
    public.is_client()
    and decided_by = auth.uid()
    and decision in ('approved', 'rejected', 'clarification_requested')
  );

-- ---------------------------------------------------------------------------
-- Support requests
-- ---------------------------------------------------------------------------

drop policy if exists support_requests_select on public.support_requests;
create policy support_requests_select on public.support_requests
  for select to authenticated
  using (deleted_at is null and public.can_access_client(client_id));

drop policy if exists support_requests_insert on public.support_requests;
create policy support_requests_insert on public.support_requests
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and public.can_access_client(client_id)
    and (
      public.is_agency()
      or (
        client_id = public.current_client_id()
        and status = 'open'
        and assigned_to is null
        and covered_by_plan is null
      )
    )
  );

drop policy if exists support_requests_agency_write on public.support_requests;
create policy support_requests_agency_write on public.support_requests
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

drop policy if exists support_requests_client_update on public.support_requests;
create policy support_requests_client_update on public.support_requests
  for update to authenticated
  using (
    public.is_client()
    and client_id = public.current_client_id()
    and status in ('open', 'awaiting_client')
  )
  with check (
    public.is_client()
    and client_id = public.current_client_id()
    and status in ('open', 'awaiting_client', 'closed')
  );

-- ---------------------------------------------------------------------------
-- Maintenance
-- ---------------------------------------------------------------------------

-- Clients see the tiers the agency has published; agency sees everything.
drop policy if exists maintenance_plans_select on public.maintenance_plans;
create policy maintenance_plans_select on public.maintenance_plans
  for select to authenticated
  using (public.is_agency() or (is_active and is_public));

drop policy if exists maintenance_plans_write on public.maintenance_plans;
create policy maintenance_plans_write on public.maintenance_plans
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

drop policy if exists subscriptions_select on public.maintenance_subscriptions;
create policy subscriptions_select on public.maintenance_subscriptions
  for select to authenticated
  using (deleted_at is null and public.can_access_client(client_id));

-- Clients never write to a subscription. They raise a plan request instead.
drop policy if exists subscriptions_write on public.maintenance_subscriptions;
create policy subscriptions_write on public.maintenance_subscriptions
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

drop policy if exists usage_select on public.maintenance_usage;
create policy usage_select on public.maintenance_usage
  for select to authenticated
  using (public.can_access_client(client_id));

drop policy if exists usage_write on public.maintenance_usage;
create policy usage_write on public.maintenance_usage
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

drop policy if exists maintenance_events_select on public.maintenance_events;
create policy maintenance_events_select on public.maintenance_events
  for select to authenticated
  using (exists (
    select 1 from public.maintenance_subscriptions s
    where s.id = subscription_id and public.can_access_client(s.client_id)
  ));

drop policy if exists maintenance_events_insert on public.maintenance_events;
create policy maintenance_events_insert on public.maintenance_events
  for insert to authenticated
  with check (public.is_agency());
-- No UPDATE/DELETE: subscription history is immutable.

drop policy if exists plan_requests_select on public.maintenance_plan_requests;
create policy plan_requests_select on public.maintenance_plan_requests
  for select to authenticated
  using (public.can_access_client(client_id));

drop policy if exists plan_requests_client_insert on public.maintenance_plan_requests;
create policy plan_requests_client_insert on public.maintenance_plan_requests
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and public.can_access_client(client_id)
    and (public.is_agency() or (client_id = public.current_client_id() and status = 'pending'))
  );

drop policy if exists plan_requests_agency_write on public.maintenance_plan_requests;
create policy plan_requests_agency_write on public.maintenance_plan_requests
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

-- A client may withdraw their own pending request, nothing more.
drop policy if exists plan_requests_client_withdraw on public.maintenance_plan_requests;
create policy plan_requests_client_withdraw on public.maintenance_plan_requests
  for update to authenticated
  using (
    public.is_client()
    and client_id = public.current_client_id()
    and status = 'pending'
  )
  with check (
    public.is_client()
    and client_id = public.current_client_id()
    and status = 'withdrawn'
  );

-- Reminders are an internal operations tool.
drop policy if exists reminders_select on public.renewal_reminders;
create policy reminders_select on public.renewal_reminders
  for select to authenticated using (public.is_agency());

drop policy if exists reminders_write on public.renewal_reminders;
create policy reminders_write on public.renewal_reminders
  for all to authenticated
  using (public.is_agency()) with check (public.is_agency());

-- ---------------------------------------------------------------------------
-- Handover documents visibility + client acceptance
-- ---------------------------------------------------------------------------

-- Replace the generic handover_documents read policy with one that honours
-- visible_to_client.
drop policy if exists handover_documents_select on public.handover_documents;
drop policy if exists handover_documents_select on public.handover_documents;
create policy handover_documents_select on public.handover_documents
  for select to authenticated
  using (
    public.can_access_project(project_id)
    and (public.is_agency() or visible_to_client)
  );

drop policy if exists handover_template_items_select on public.handover_template_items;
create policy handover_template_items_select on public.handover_template_items
  for select to authenticated using (public.is_agency());

drop policy if exists handover_template_items_write on public.handover_template_items;
create policy handover_template_items_write on public.handover_template_items
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

drop policy if exists client_acceptances_select on public.client_acceptances;
create policy client_acceptances_select on public.client_acceptances
  for select to authenticated
  using (public.can_access_project(project_id));

-- Only a client_owner may formally accept, and only for their own project.
drop policy if exists client_acceptances_insert on public.client_acceptances;
create policy client_acceptances_insert on public.client_acceptances
  for insert to authenticated
  with check (
    approved_by = auth.uid()
    and public.can_access_project(project_id)
    and public.current_app_role()::text = 'client_owner'
  );
-- No UPDATE/DELETE: acceptance is permanent.

-- ---------------------------------------------------------------------------
-- System tables
-- ---------------------------------------------------------------------------

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Recipients may only mark their own notifications read.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.is_agency() or user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists activity_select on public.activity_logs;
create policy activity_select on public.activity_logs
  for select to authenticated
  using (
    (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and client_id is not null and public.can_access_client(client_id))
    )
    and (public.is_agency() or visibility = 'client')
  );

drop policy if exists activity_insert on public.activity_logs;
create policy activity_insert on public.activity_logs
  for insert to authenticated
  with check (
    (project_id is not null and public.can_access_project(project_id))
    or (project_id is null and client_id is not null and public.can_access_client(client_id))
  );
-- No UPDATE/DELETE: the activity feed is permanent.

drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select to authenticated using (public.is_agency_admin());
-- No INSERT/UPDATE/DELETE policies at all.
-- Rows are written exclusively through public.record_audit().

-- ###########################################################################
-- 0012_column_guards.sql
-- ###########################################################################
-- ===========================================================================
-- 0012  Column-level guards
-- ===========================================================================
-- RLS decides WHICH ROWS a user may update; it cannot restrict WHICH COLUMNS.
-- Without these triggers a client could craft a PATCH against a row they are
-- legitimately allowed to update and change a commercial or approval field.
-- Each guard below raises rather than silently ignoring the change, so a bad
-- request fails loudly instead of quietly succeeding in part.

-- --- files: a client must not approve their own upload ----------------------
create or replace function public.guard_file_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.approval_status is distinct from old.approval_status
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.review_notes is distinct from old.review_notes
     or new.is_client_visible is distinct from old.is_client_visible
     or new.storage_path is distinct from old.storage_path
     or new.size_bytes is distinct from old.size_bytes
     or new.project_id is distinct from old.project_id
     or new.client_id is distinct from old.client_id then
    raise exception 'Only agency users may change file approval or storage fields';
  end if;

  return new;
end;
$$;

drop trigger if exists files_guard_columns on public.files;
create trigger files_guard_columns
  before update on public.files
  for each row execute function public.guard_file_columns();

-- --- change_requests: commercial fields are agency-owned --------------------
create or replace function public.guard_change_request_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.billing_treatment is distinct from old.billing_treatment
     or new.estimated_hours is distinct from old.estimated_hours
     or new.estimated_cost is distinct from old.estimated_cost
     or new.estimated_completion_date is distinct from old.estimated_completion_date
     or new.assigned_to is distinct from old.assigned_to
     or new.client_notes is distinct from old.client_notes
     or new.logged_minutes is distinct from old.logged_minutes
     or new.subscription_id is distinct from old.subscription_id
     or new.reference is distinct from old.reference
     or new.client_id is distinct from old.client_id
     or new.project_id is distinct from old.project_id
     or new.completed_at is distinct from old.completed_at then
    raise exception 'Only agency users may change commercial or assignment fields on a change request';
  end if;

  return new;
end;
$$;

drop trigger if exists change_requests_guard_columns on public.change_requests;
create trigger change_requests_guard_columns
  before update on public.change_requests
  for each row execute function public.guard_change_request_columns();

-- --- support_requests: triage and coverage are agency-owned ----------------
create or replace function public.guard_support_request_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.covered_by_plan is distinct from old.covered_by_plan
     or new.coverage_note is distinct from old.coverage_note
     or new.assigned_to is distinct from old.assigned_to
     or new.time_spent_minutes is distinct from old.time_spent_minutes
     or new.response_due_at is distinct from old.response_due_at
     or new.first_response_at is distinct from old.first_response_at
     or new.resolution_summary is distinct from old.resolution_summary
     or new.subscription_id is distinct from old.subscription_id
     or new.reference is distinct from old.reference
     or new.client_id is distinct from old.client_id then
    raise exception 'Only agency users may change triage fields on a support request';
  end if;

  return new;
end;
$$;

drop trigger if exists support_requests_guard_columns on public.support_requests;
create trigger support_requests_guard_columns
  before update on public.support_requests
  for each row execute function public.guard_support_request_columns();

-- --- tasks: a client may only move the status of their own action ----------
create or replace function public.guard_task_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.assignee_id is distinct from old.assignee_id
     or new.responsibility is distinct from old.responsibility
     or new.due_date is distinct from old.due_date
     or new.priority is distinct from old.priority
     or new.work_stream is distinct from old.work_stream
     or new.is_client_visible is distinct from old.is_client_visible
     or new.project_id is distinct from old.project_id then
    raise exception 'Clients may only change the status of a task assigned to them';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_guard_columns on public.tasks;
create trigger tasks_guard_columns
  before update on public.tasks
  for each row execute function public.guard_task_columns();

-- --- website_pages: approval is agency-owned -------------------------------
create or replace function public.guard_website_page_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.approved_at is distinct from old.approved_at
     or new.approved_by is distinct from old.approved_by
     or new.agency_feedback is distinct from old.agency_feedback
     or new.project_id is distinct from old.project_id then
    raise exception 'Only agency users may approve page content';
  end if;

  return new;
end;
$$;

drop trigger if exists website_pages_guard_columns on public.website_pages;
create trigger website_pages_guard_columns
  before update on public.website_pages
  for each row execute function public.guard_website_page_columns();

-- --- onboarding_sections: review fields are agency-owned -------------------
create or replace function public.guard_onboarding_section_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.agency_feedback is distinct from old.agency_feedback
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.key is distinct from old.key
     or new.project_id is distinct from old.project_id then
    raise exception 'Only agency users may review an onboarding section';
  end if;

  return new;
end;
$$;

drop trigger if exists onboarding_sections_guard_columns on public.onboarding_sections;
create trigger onboarding_sections_guard_columns
  before update on public.onboarding_sections
  for each row execute function public.guard_onboarding_section_columns();

-- --- change_request_approvals: a client may only record a decision ---------
create or replace function public.guard_cra_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.quoted_hours is distinct from old.quoted_hours
     or new.quoted_cost is distinct from old.quoted_cost
     or new.quote_notes is distinct from old.quote_notes
     or new.proposed_completion_date is distinct from old.proposed_completion_date
     or new.billing_treatment is distinct from old.billing_treatment
     or new.offered_by is distinct from old.offered_by
     or new.change_request_id is distinct from old.change_request_id then
    raise exception 'Clients may only approve, reject or query a quotation';
  end if;

  new.decided_at := coalesce(new.decided_at, now());
  return new;
end;
$$;

drop trigger if exists cra_guard_columns on public.change_request_approvals;
create trigger cra_guard_columns
  before update on public.change_request_approvals
  for each row execute function public.guard_cra_columns();

-- --- maintenance_plan_requests: review fields are agency-owned -------------
create or replace function public.guard_plan_request_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.response_notes is distinct from old.response_notes
     or new.requested_plan_id is distinct from old.requested_plan_id
     or new.subscription_id is distinct from old.subscription_id
     or new.client_id is distinct from old.client_id then
    raise exception 'Only agency users may review a maintenance plan request';
  end if;

  return new;
end;
$$;

drop trigger if exists plan_requests_guard_columns on public.maintenance_plan_requests;
create trigger plan_requests_guard_columns
  before update on public.maintenance_plan_requests
  for each row execute function public.guard_plan_request_columns();

-- --- change_requests: legal client state transitions ------------------------
-- A policy cannot compare the old and new row, so the transition map lives
-- here. Without it a client could jump their own request straight to
-- "approved" and skip triage.
create or replace function public.guard_change_request_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed public.change_request_status[];
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  v_allowed := case old.status
    -- Before triage: withdraw it, nothing else.
    when 'submitted' then array['cancelled']::public.change_request_status[]
    -- Answering a request for more information re-submits it.
    when 'more_information_required' then
      array['submitted', 'cancelled']::public.change_request_status[]
    -- Deciding on a quotation.
    when 'awaiting_client_approval' then
      array['approved', 'rejected', 'more_information_required']::public.change_request_status[]
    -- Reviewing finished work: accept it, or send it back.
    when 'client_review' then
      array['completed', 'more_information_required']::public.change_request_status[]
    else array[]::public.change_request_status[]
  end;

  if not (new.status = any (v_allowed)) then
    raise exception 'A change request cannot be moved from % to % by a client',
      old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists change_requests_guard_transition on public.change_requests;
create trigger change_requests_guard_transition
  before update of status on public.change_requests
  for each row execute function public.guard_change_request_transition();

-- ###########################################################################
-- 0013_storage.sql
-- ###########################################################################
-- ===========================================================================
-- 0013  Storage buckets and object policies
-- ===========================================================================
-- One private bucket. Object keys follow:
--     projects/<project_id>/<uuid>-<filename>
--     clients/<client_id>/<uuid>-<filename>     (files not tied to a project)
-- The same predicates that guard the `files` rows guard the bytes, so a leaked
-- object key is useless without an authorised session.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  104857600,  -- 100 MB
  array[
    'image/png','image/jpeg','image/gif','image/webp','image/svg+xml','image/avif',
    'video/mp4','video/webm','video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain','text/csv','text/markdown',
    'application/zip','application/x-zip-compressed',
    'font/otf','font/ttf','font/woff','font/woff2',
    'application/postscript'  -- .ai / .eps brand assets
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = false;

-- Resolves the owning scope from the object key.
create or replace function public.storage_object_allowed(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_scope text;
  v_id    uuid;
begin
  v_parts := storage.foldername(p_name);

  if array_length(v_parts, 1) is null or array_length(v_parts, 1) < 2 then
    return false;
  end if;

  v_scope := v_parts[1];

  begin
    v_id := v_parts[2]::uuid;
  exception when others then
    return false;
  end;

  if v_scope = 'projects' then
    return case when p_write
                then public.can_access_project(v_id)  -- clients upload too
                else public.can_access_project(v_id)
           end;
  elsif v_scope = 'clients' then
    return public.can_access_client(v_id);
  end if;

  return false;
end;
$$;

drop policy if exists "project files are readable by authorised users" on storage.objects;
create policy "project files are readable by authorised users"
  on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and public.storage_object_allowed(name, false));

drop policy if exists "project files are writable by authorised users" on storage.objects;
create policy "project files are writable by authorised users"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.storage_object_allowed(name, true));

-- Replacing an object requires edit rights on the owning project.
drop policy if exists "project files are updatable by their owner or the agency" on storage.objects;
create policy "project files are updatable by their owner or the agency"
  on storage.objects for update to authenticated
  using (bucket_id = 'project-files' and (owner = auth.uid() or public.is_agency()))
  with check (bucket_id = 'project-files' and public.storage_object_allowed(name, true));

drop policy if exists "project files are removable by the agency or uploader" on storage.objects;
create policy "project files are removable by the agency or uploader"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-files'
    and (owner = auth.uid() or public.is_agency_manager())
  );

-- ###########################################################################
-- 0014_staff_signup.sql
-- ###########################################################################
-- ===========================================================================
-- 0014  Staff self-registration
-- ===========================================================================
-- Agency staff register themselves through Supabase Authentication; client
-- logins are then created by staff from inside the platform.
--
-- Open signup with no gate would let anyone on the internet create an agency
-- account, so handle_new_user() now applies a ladder:
--
--   1. A pending invitation      -> exactly what the invitation says
--   2. No agency admin exists    -> this is the first account; make it the
--                                   administrator (bootstrap, once only)
--   3. Email domain allow-listed -> staff account, active or pending approval
--      by the agency                depending on the configured mode
--   4. Anything else             -> inactive, no organisation, sees nothing
--
-- Step 4 is the important one: an uninvited stranger who signs up gets an
-- account that can read nothing at all, because every RLS predicate requires
-- an active profile with an organisation.

alter table public.agency_settings
  add column if not exists staff_email_domains text[] not null default '{}',
  add column if not exists staff_signup_mode text not null default 'approval_required',
  add column if not exists staff_default_role public.app_role not null default 'project_manager';

do $$ begin
  alter table public.agency_settings
    add constraint agency_settings_staff_signup_mode_check
    check (staff_signup_mode in ('disabled', 'domain_allowlist', 'approval_required'));
exception when duplicate_object then null; end $$;

comment on column public.agency_settings.staff_email_domains is
  'Domains whose signups are treated as agency staff, e.g. {northpointdigital.co.uk}. '
  'Empty means no domain is trusted and only invitations create staff accounts.';

comment on column public.agency_settings.staff_signup_mode is
  'disabled: domain signups get no access. '
  'domain_allowlist: an allow-listed domain becomes an active staff account. '
  'approval_required: an allow-listed domain becomes a staff account awaiting activation.';

-- The agency organisation every staff account attaches to. Created on demand so
-- the first signup works even on a database where only the schema was applied.
create or replace function public.ensure_agency_organisation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_name text;
begin
  select id into v_id
  from public.organisations
  where kind = 'agency' and deleted_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select agency_name into v_name from public.agency_settings limit 1;

  insert into public.organisations (kind, name, slug)
  values (
    'agency',
    coalesce(v_name, 'Agency'),
    -- Fixed slug: there is only ever one agency organisation.
    'agency'
  )
  on conflict (slug) do update set kind = 'agency'
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite       public.invitations%rowtype;
  v_name         text;
  v_domain       text;
  v_settings     public.agency_settings%rowtype;
  v_agency_org   uuid;
  v_has_admin    boolean;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- ---------------------------------------------------------------- 1. invited
  select * into v_invite
  from public.invitations
  where email = new.email
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_invite.id is not null then
    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (
      new.id,
      new.email,
      coalesce(nullif(trim(v_invite.full_name), ''), v_name),
      v_invite.role,
      v_invite.organisation_id,
      true
    )
    on conflict (id) do update
      set role            = excluded.role,
          organisation_id = excluded.organisation_id,
          is_active       = true;

    update public.invitations set accepted_at = now() where id = v_invite.id;

    if v_invite.client_id is not null then
      update public.clients
      set primary_contact_name = coalesce(nullif(trim(primary_contact_name), ''), v_name),
          email                = coalesce(email, new.email)
      where id = v_invite.client_id;
    end if;

    return new;
  end if;

  select * into v_settings from public.agency_settings limit 1;

  -- ------------------------------------------------------- 2. first ever account
  select exists (
    select 1 from public.users
    where role::text = 'agency_admin' and is_active and deleted_at is null
  ) into v_has_admin;

  if not v_has_admin then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, v_name, 'agency_admin', v_agency_org, true)
    on conflict (id) do update
      set role            = 'agency_admin',
          organisation_id = excluded.organisation_id,
          is_active       = true;

    return new;
  end if;

  -- ------------------------------------------------ 3. allow-listed staff domain
  v_domain := lower(split_part(new.email, '@', 2));

  if v_settings.id is not null
     and v_settings.staff_signup_mode <> 'disabled'
     and v_domain = any (
       select lower(d) from unnest(v_settings.staff_email_domains) d
     )
  then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (
      new.id,
      new.email,
      v_name,
      v_settings.staff_default_role,
      v_agency_org,
      -- Active immediately only where the agency has said an allow-listed
      -- domain is enough on its own.
      v_settings.staff_signup_mode = 'domain_allowlist'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- ------------------------------------------------------------- 4. no access
  insert into public.users (id, email, full_name, role, organisation_id, is_active)
  values (new.id, new.email, v_name, 'client_member', null, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Staff awaiting activation, for the approval queue in Settings.
create index if not exists users_pending_activation_idx
  on public.users (created_at desc)
  where not is_active and deleted_at is null and organisation_id is not null;

-- ###########################################################################
-- 0015_internal_notes.sql
-- ###########################################################################
-- ===========================================================================
-- 0015  Move agency-only notes out of client-readable tables
-- ===========================================================================
-- Row Level Security decides which ROWS a user may read. It cannot restrict
-- which COLUMNS. So a client who is legitimately allowed to read their own
-- change request could also read `internal_notes` on it — by querying the
-- PostgREST API directly with their own key, which is public by design.
--
-- Hiding the column in application queries is not a fix: the API is reachable
-- without the application. The only reliable answer is to keep agency-only
-- text in a table a client cannot read at all.
--
-- This matters more, not less, if the front end talks straight to Supabase.

create table if not exists public.internal_notes (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in (
                 'client', 'project', 'project_plan', 'change_request',
                 'support_request', 'maintenance_subscription'
               )),
  entity_id    uuid not null,
  -- Denormalised so the policy is an index lookup rather than six joins.
  project_id   uuid references public.projects (id) on delete cascade,
  client_id    uuid references public.clients (id) on delete cascade,
  body         text not null default '',
  updated_by   uuid references public.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create index if not exists internal_notes_project_idx on public.internal_notes (project_id);
create index if not exists internal_notes_client_idx on public.internal_notes (client_id);

drop trigger if exists internal_notes_set_updated_at on public.internal_notes;
create trigger internal_notes_set_updated_at
  before update on public.internal_notes
  for each row execute function public.set_updated_at();

comment on table public.internal_notes is
  'Agency-only free text. Separated from the entity tables because RLS cannot '
  'restrict columns, so a client permitted to read a row could otherwise read '
  'agency notes on it straight from the API.';

alter table public.internal_notes enable row level security;
alter table public.internal_notes force row level security;

-- No client policy of any kind. There is nothing for a client to read here.
drop policy if exists internal_notes_agency_all on public.internal_notes;
create policy internal_notes_agency_all on public.internal_notes
  for all to authenticated
  using (
    public.is_agency()
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and client_id is not null and public.can_access_client(client_id))
      or (project_id is null and client_id is null and public.is_agency_manager())
    )
  )
  with check (
    public.is_agency()
    and (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and client_id is not null and public.can_access_client(client_id))
      or (project_id is null and client_id is null and public.is_agency_manager())
    )
  );

-- --- Detach what references the columns before dropping them -----------------
-- Two insert policies assert `internal_notes is null` for a client's own row,
-- and two guard triggers compare the column on update. Once the column is gone
-- the policies block the drop and the functions would fail at runtime, so both
-- are rebuilt without it. Neither loses anything: the column they were
-- protecting no longer exists on a table the client can reach.

drop policy if exists change_requests_client_insert on public.change_requests;
drop policy if exists support_requests_insert on public.support_requests;

create or replace function public.guard_change_request_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.billing_treatment is distinct from old.billing_treatment
     or new.estimated_hours is distinct from old.estimated_hours
     or new.estimated_cost is distinct from old.estimated_cost
     or new.estimated_completion_date is distinct from old.estimated_completion_date
     or new.assigned_to is distinct from old.assigned_to
     or new.client_notes is distinct from old.client_notes
     or new.logged_minutes is distinct from old.logged_minutes
     or new.subscription_id is distinct from old.subscription_id
     or new.reference is distinct from old.reference
     or new.client_id is distinct from old.client_id
     or new.project_id is distinct from old.project_id
     or new.completed_at is distinct from old.completed_at then
    raise exception 'Only agency users may change commercial or assignment fields on a change request';
  end if;

  return new;
end;
$$;

create or replace function public.guard_support_request_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_service_context() or public.is_agency() then
    return new;
  end if;

  if new.covered_by_plan is distinct from old.covered_by_plan
     or new.coverage_note is distinct from old.coverage_note
     or new.assigned_to is distinct from old.assigned_to
     or new.time_spent_minutes is distinct from old.time_spent_minutes
     or new.response_due_at is distinct from old.response_due_at
     or new.first_response_at is distinct from old.first_response_at
     or new.resolution_summary is distinct from old.resolution_summary
     or new.subscription_id is distinct from old.subscription_id
     or new.reference is distinct from old.reference
     or new.client_id is distinct from old.client_id then
    raise exception 'Only agency users may change triage fields on a support request';
  end if;

  return new;
end;
$$;

-- --- Carry across anything already recorded ---------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'internal_notes'
  ) then
    insert into public.internal_notes (entity_type, entity_id, client_id, body)
    select 'client', id, id, internal_notes
    from public.clients
    where internal_notes is not null and trim(internal_notes) <> ''
    on conflict (entity_type, entity_id) do nothing;

    alter table public.clients drop column internal_notes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'internal_notes'
  ) then
    insert into public.internal_notes (entity_type, entity_id, project_id, client_id, body)
    select 'project', id, id, client_id, internal_notes
    from public.projects
    where internal_notes is not null and trim(internal_notes) <> ''
    on conflict (entity_type, entity_id) do nothing;

    alter table public.projects drop column internal_notes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'project_plans' and column_name = 'notes'
  ) then
    insert into public.internal_notes (entity_type, entity_id, project_id, body)
    select 'project_plan', id, project_id, notes
    from public.project_plans
    where notes is not null and trim(notes) <> ''
    on conflict (entity_type, entity_id) do nothing;

    alter table public.project_plans drop column notes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'change_requests' and column_name = 'internal_notes'
  ) then
    insert into public.internal_notes (entity_type, entity_id, project_id, client_id, body)
    select 'change_request', id, project_id, client_id, internal_notes
    from public.change_requests
    where internal_notes is not null and trim(internal_notes) <> ''
    on conflict (entity_type, entity_id) do nothing;

    alter table public.change_requests drop column internal_notes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'support_requests' and column_name = 'internal_notes'
  ) then
    insert into public.internal_notes (entity_type, entity_id, project_id, client_id, body)
    select 'support_request', id, project_id, client_id, internal_notes
    from public.support_requests
    where internal_notes is not null and trim(internal_notes) <> ''
    on conflict (entity_type, entity_id) do nothing;

    alter table public.support_requests drop column internal_notes;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'maintenance_subscriptions' and column_name = 'internal_notes'
  ) then
    insert into public.internal_notes (entity_type, entity_id, project_id, client_id, body)
    select 'maintenance_subscription', id, project_id, client_id, internal_notes
    from public.maintenance_subscriptions
    where internal_notes is not null and trim(internal_notes) <> ''
    on conflict (entity_type, entity_id) do nothing;

    alter table public.maintenance_subscriptions drop column internal_notes;
  end if;
end $$;

-- --- Other tables a client could read but should not ------------------------

-- The risk register is an internal planning artefact. "The client may not pay
-- on time" is not something to hand the client.
drop policy if exists project_risks_select on public.project_risks;
create policy project_risks_select on public.project_risks
  for select to authenticated
  using (public.is_agency() and public.can_access_project(project_id));

-- A handover in preparation is not for the client's eyes; a delivered one is.
drop policy if exists handovers_select on public.handovers;
create policy handovers_select on public.handovers
  for select to authenticated
  using (
    public.can_access_project(project_id)
    and (public.is_agency() or status in ('delivered', 'accepted'))
  );

drop policy if exists handover_checklists_select on public.handover_checklists;
create policy handover_checklists_select on public.handover_checklists
  for select to authenticated
  using (public.is_agency() and public.can_access_project(project_id));

-- Checklist items are agency working notes, not client-facing.
drop policy if exists handover_items_select on public.handover_items;
create policy handover_items_select on public.handover_items
  for select to authenticated
  using (public.is_agency() and public.can_access_project(project_id));

-- The invitation token is a credential. Nobody reads it through the API — the
-- acceptance flow uses the link Supabase emails — so no one needs to select it.
drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations
  for select to authenticated
  using (public.is_agency());

-- --- Rebuild the insert policies without the removed column -----------------
drop policy if exists change_requests_client_insert on public.change_requests;
create policy change_requests_client_insert on public.change_requests
  for insert to authenticated
  with check (
    public.can_access_project(project_id)
    and submitted_by = auth.uid()
    and (
      public.is_agency()
      -- A client may only raise a request against their own project, in the
      -- initial state, and may not set any of the commercial fields.
      or (
        client_id = public.current_client_id()
        and status = 'submitted'
        and billing_treatment is null
        and estimated_hours is null
        and estimated_cost is null
        and assigned_to is null
      )
    )
  );

drop policy if exists support_requests_insert on public.support_requests;
create policy support_requests_insert on public.support_requests
  for insert to authenticated
  with check (
    submitted_by = auth.uid()
    and public.can_access_client(client_id)
    and (
      public.is_agency()
      or (
        client_id = public.current_client_id()
        and status = 'open'
        and assigned_to is null
        and covered_by_plan is null
      )
    )
  );

-- ###########################################################################
-- 0016_signup_hints.sql
-- ###########################################################################
-- Public hints for the staff signup screen.
--
-- The signup form is reached by someone who is not signed in, so it cannot read
-- agency_settings: that table is readable by authenticated users only, and it
-- holds settings that are nobody else's business.
--
-- Without this the screen has to guess, and it guessed wrongly — telling every
-- visitor that no domains were approved. This function discloses exactly the
-- three facts the screen needs to give accurate instructions, and nothing else:
-- whether self-registration is open, which email domains are accepted, and
-- whether this is a brand-new installation whose first account becomes the
-- administrator.
--
-- None of that is sensitive. The domains are the agency's own public email
-- domains, and knowing the mode does not grant an account — handle_new_user()
-- still decides what a new signup is allowed to be, and an address on an
-- approved domain still has to be a real mailbox the person can receive at.

create or replace function public.staff_signup_hints()
returns table (
  signup_mode text,
  email_domains text[],
  is_first_account boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(s.staff_signup_mode, 'approval_required')::text,
    coalesce(s.staff_email_domains, array[]::text[]),
    not exists (
      select 1
      from public.users u
      where u.role::text = 'agency_admin'
        and u.is_active
        and u.deleted_at is null
    )
  from (select 1) one
  left join public.agency_settings s on true
  limit 1;
$$;

comment on function public.staff_signup_hints() is
  'Non-sensitive signup guidance for the public signup screen: mode, approved '
  'email domains, and whether this installation has an administrator yet.';

revoke all on function public.staff_signup_hints() from public;
grant execute on function public.staff_signup_hints() to anon, authenticated;

-- ###########################################################################
-- 0017_manager_deletes.sql
-- ###########################################################################
-- ===========================================================================
-- Deleting a client or a project is a project manager's job
-- ===========================================================================
-- Both delete policies were written for agency administrators only. The
-- agency's own answer is that a project manager should be able to do it, so
-- these widen to is_agency_manager() — which is 'agency_admin' or
-- 'project_manager', and nobody else.
--
-- A developer, designer, QA or support agent still cannot, and neither can any
-- client role. Widening here rather than in the application matters: the
-- policy is what actually decides, and a browser that asked anyway would still
-- be refused.
--
-- The rest of the schema is unchanged. Soft deletion remains how records are
-- normally retired; this governs the permanent kind.
-- ===========================================================================

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_agency_manager());

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_agency_manager());

comment on policy clients_delete on public.clients is
  'Permanent deletion, cascading to projects, files, requests and subscriptions. '
  'Project managers and administrators only.';

comment on policy projects_delete on public.projects is
  'Permanent deletion, cascading to tasks, content, comments and handover. '
  'Project managers and administrators only.';

-- ###########################################################################
-- 0018_two_roles.sql
-- ###########################################################################
-- ===========================================================================
-- Two account types: agency and client
-- ===========================================================================
-- app_role carried nine values — seven agency roles and two client ones —
-- because the original brief asked for room to grow into them. The agency's
-- answer, having used it, is that there are two kinds of account: people who
-- work here, and people we work for. So the enum now says exactly that.
--
-- The policies are almost entirely untouched. All ~105 of them are written
-- against is_agency(), is_agency_admin(), is_agency_manager() and is_client()
-- rather than against role literals, so redefining those four functions moves
-- the whole permission model at once. That was worth the indirection.
--
-- What changes in substance, stated plainly because collapsing roles cannot be
-- neutral:
--
--   Every agency user now has what an administrator had. They can change
--   agency settings, approve new staff, and permanently delete a client or a
--   project. Previously a developer could do none of those. That is the
--   consequence of having one staff role, not an oversight.
--
--   A client can no longer invite their own colleagues. The two policies that
--   allowed a 'client_owner' to do so had no meaning once there is a single
--   client role, and the agency issuing every client login is both simpler and
--   tighter. It is also what the brief asked for originally.
--
--   Any client user can now sign off a handover. That was a 'client_owner'
--   privilege; with one client role it belongs to all of them.
--
-- Existing accounts are mapped, not dropped: the seven agency roles all become
-- 'agency' and both client roles become 'client'. Nobody loses access and
-- nobody has to be re-invited.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- 1. Remove what depends on the old type
-- --------------------------------------------------------------------------
-- These three policies test current_app_role() against a literal, so they hold
-- the function, which holds the type. Two of them are gone for good; the
-- acceptance one is rebuilt below.
drop policy if exists invitations_client_owner_insert on public.invitations;
drop policy if exists invitations_client_owner_revoke on public.invitations;
drop policy if exists client_acceptances_insert on public.client_acceptances;

drop function if exists public.current_app_role();

-- The partial index names the client roles in its predicate.
drop index if exists public.users_active_agency_idx;

-- --------------------------------------------------------------------------
-- 2. Swap the type
-- --------------------------------------------------------------------------
-- Postgres cannot remove a value from an enum, so the type is replaced and
-- every column converted through a mapping cast.
do $$
begin
  if exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_role' and e.enumlabel = 'agency_admin'
  ) then
    alter type public.app_role rename to app_role_legacy;
    create type public.app_role as enum ('agency', 'client');

    alter table public.users
      alter column role drop default,
      alter column role type public.app_role
        using (
          case when role::text in ('client_owner', 'client_member')
               then 'client' else 'agency' end
        )::public.app_role,
      alter column role set default 'client';

    alter table public.invitations
      alter column role type public.app_role
        using (
          case when role::text in ('client_owner', 'client_member')
               then 'client' else 'agency' end
        )::public.app_role;

    alter table public.agency_settings
      alter column staff_default_role drop default,
      alter column staff_default_role type public.app_role
        using (
          case when staff_default_role::text in ('client_owner', 'client_member')
               then 'client' else 'agency' end
        )::public.app_role,
      alter column staff_default_role set default 'agency';

    drop type public.app_role_legacy;
  end if;
end $$;

create index if not exists users_active_agency_idx
  on public.users (role)
  where is_active and deleted_at is null and role = 'agency';

-- --------------------------------------------------------------------------
-- 3. Redefine the predicates the policies are written against
-- --------------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid()
    and u.is_active
    and u.deleted_at is null;
$$;

create or replace function public.is_agency()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'agency'
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

-- Kept as separate names so the policies do not have to change, and so the
-- distinctions can come back if the agency ever wants them again. Today all
-- three mean the same thing.
create or replace function public.is_agency_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_agency();
$$;

create or replace function public.is_agency_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_agency();
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'client'
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.users u
  join public.clients c on c.organisation_id = u.organisation_id
  where u.id = auth.uid()
    and u.is_active
    and u.deleted_at is null
    and u.role = 'client'
    and c.deleted_at is null;
$$;

-- --------------------------------------------------------------------------
-- 4. Rebuild what was dropped
-- --------------------------------------------------------------------------
-- Signing off the handover is now open to any client user rather than to the
-- one nominated administrator.
drop policy if exists client_acceptances_insert on public.client_acceptances;
create policy client_acceptances_insert on public.client_acceptances
  for insert to authenticated
  with check (
    approved_by = auth.uid()
    and public.can_access_project(project_id)
    and public.is_client()
  );

comment on table public.client_acceptances is
  'Permanent record of a client signing off a handover. No update or delete '
  'policy exists for anyone.';

-- --------------------------------------------------------------------------
-- 5. The signup ladder, in two-role terms
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite      public.invitations%rowtype;
  v_settings    public.agency_settings%rowtype;
  v_name        text;
  v_has_agency  boolean;
  v_agency_org  uuid;
  v_domain      text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  -- 1. A pending invitation decides everything.
  select * into v_invite
  from public.invitations
  where email = new.email
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, coalesce(nullif(v_name, ''), v_invite.full_name, ''),
            v_invite.role, v_invite.organisation_id, true)
    on conflict (id) do update
      set role            = excluded.role,
          organisation_id = excluded.organisation_id,
          is_active       = true;

    update public.invitations set accepted_at = now() where id = v_invite.id;

    if v_invite.client_id is not null then
      update public.clients
      set primary_contact_name = coalesce(nullif(trim(primary_contact_name), ''), v_name),
          email                = coalesce(email, new.email)
      where id = v_invite.client_id;
    end if;

    return new;
  end if;

  select * into v_settings from public.agency_settings limit 1;

  -- 2. The first account ever created runs the agency.
  select exists (
    select 1 from public.users
    where role = 'agency' and is_active and deleted_at is null
  ) into v_has_agency;

  if not v_has_agency then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, v_name, 'agency', v_agency_org, true)
    on conflict (id) do update
      set role            = 'agency',
          organisation_id = excluded.organisation_id,
          is_active       = true;

    return new;
  end if;

  -- 3. An allow-listed work email address becomes agency staff.
  v_domain := lower(split_part(new.email, '@', 2));

  if v_settings.id is not null
     and v_settings.staff_signup_mode <> 'disabled'
     and v_domain = any (
       select lower(d) from unnest(v_settings.staff_email_domains) d
     )
  then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (
      new.id, new.email, v_name, 'agency', v_agency_org,
      v_settings.staff_signup_mode = 'domain_allowlist'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- 4. Anyone else gets an account with no organisation, which can read
  --    nothing at all. This rung is what makes an open signup form safe.
  insert into public.users (id, email, full_name, role, organisation_id, is_active)
  values (new.id, new.email, v_name, 'client', null, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The public signup screen counts agency accounts, not administrators.
create or replace function public.staff_signup_hints()
returns table (
  signup_mode text,
  email_domains text[],
  is_first_account boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(s.staff_signup_mode, 'approval_required')::text,
    coalesce(s.staff_email_domains, array[]::text[]),
    not exists (
      select 1 from public.users u
      where u.role = 'agency' and u.is_active and u.deleted_at is null
    )
  from (select 1) one
  left join public.agency_settings s on true
  limit 1;
$$;

revoke all on function public.staff_signup_hints() from public;
grant execute on function public.staff_signup_hints() to anon, authenticated;

-- ###########################################################################
-- seed.sql — agency-configurable reference data
-- ###########################################################################
-- ===========================================================================
-- Reference data seed
-- ===========================================================================
-- Idempotent. Safe to run repeatedly against a real project.
-- Contains only agency-configurable reference data: settings, lifecycle
-- stages, the default onboarding template, example maintenance tiers and the
-- default handover checklist. Demo clients/projects live in
-- `node scripts/seed-demo.mjs`, which also provisions the demo logins.
-- ===========================================================================

-- --- Agency settings (singleton) --------------------------------------------
insert into public.agency_settings (id, agency_name, tagline, support_email, currency)
values (true, 'Northpoint Digital', 'Web design, development and support', 'hello@northpointdigital.test', 'GBP')
on conflict (id) do nothing;

-- --- The agency organisation -------------------------------------------------
insert into public.organisations (id, kind, name, slug)
values ('00000000-0000-4000-8000-000000000001', 'agency', 'Northpoint Digital', 'northpoint-digital')
on conflict (slug) do nothing;

-- --- Project lifecycle -------------------------------------------------------
-- Editable by an agency administrator; the application never hard-codes these.
insert into public.lifecycle_stages (key, label, description, position, colour, is_terminal, counts_toward_progress)
values
  ('lead_converted',    'Lead Converted',    'Won the work; not yet started.',                 1,  '#64748b', false, true),
  ('onboarding',        'Onboarding',        'Gathering requirements and company details.',    2,  '#6366f1', false, true),
  ('planning',          'Planning',          'Scope, milestones and deliverables agreed.',     3,  '#8b5cf6', false, true),
  ('awaiting_content',  'Awaiting Content',  'Waiting on copy, imagery or assets.',            4,  '#f59e0b', false, true),
  ('design',            'Design',            'Visual design in progress.',                     5,  '#ec4899', false, true),
  ('development',       'Development',       'Build in progress.',                             6,  '#3b82f6', false, true),
  ('internal_qa',       'Internal QA',       'Agency testing before client review.',           7,  '#06b6d4', false, true),
  ('client_review',     'Client Review',     'With the client for feedback.',                  8,  '#14b8a6', false, true),
  ('changes_requested', 'Changes Requested', 'Client feedback being actioned.',                9,  '#f97316', false, true),
  ('final_approval',    'Final Approval',    'Awaiting sign-off to launch.',                  10,  '#22c55e', false, true),
  ('launch_prep',       'Launch Preparation','DNS, hosting and go-live checks.',              11,  '#10b981', false, true),
  ('live',              'Live',              'Website is published.',                         12,  '#16a34a', false, true),
  ('handover',          'Handover',          'Documentation and training being delivered.',   13,  '#0ea5e9', false, true),
  ('maintenance',       'Maintenance',       'Ongoing support and updates.',                  14,  '#0284c7', false, true),
  ('archived',          'Archived',          'Closed; retained for reference.',               15,  '#94a3b8', true,  false)
on conflict (key) do nothing;

-- --- Default onboarding template --------------------------------------------
insert into public.onboarding_templates (id, name, description, is_default, is_active)
values (
  '00000000-0000-4000-8000-000000000010',
  'Standard website onboarding',
  'The twelve-section questionnaire used for new websites and redesigns.',
  true, true
)
on conflict (id) do nothing;

insert into public.onboarding_template_sections (template_id, key, title, description, position, is_required)
values
  ('00000000-0000-4000-8000-000000000010', 'company_information',  'Company Information',   'Who you are, what you do and who you serve.',                 1,  true),
  ('00000000-0000-4000-8000-000000000010', 'project_requirements', 'Project Requirements',  'What the website needs to achieve.',                          2,  true),
  ('00000000-0000-4000-8000-000000000010', 'branding',             'Branding',              'Logos, colours, fonts and visual style.',                     3,  true),
  ('00000000-0000-4000-8000-000000000010', 'website_content',      'Website Content',       'Copy and imagery for each page.',                             4,  true),
  ('00000000-0000-4000-8000-000000000010', 'pages_structure',      'Pages and Structure',   'The sitemap and navigation.',                                 5,  true),
  ('00000000-0000-4000-8000-000000000010', 'images_media',         'Images and Media',      'Photography, video and other media.',                         6,  true),
  ('00000000-0000-4000-8000-000000000010', 'domain_hosting',       'Domain and Hosting',    'Where the site lives and who controls it.',                   7,  true),
  ('00000000-0000-4000-8000-000000000010', 'technical_integrations','Technical Integrations','Analytics, payments, CRM and other services.',               8,  true),
  ('00000000-0000-4000-8000-000000000010', 'social_media',         'Social Media',          'Profiles, tone of voice and content requirements.',           9,  false),
  ('00000000-0000-4000-8000-000000000010', 'seo',                  'SEO',                   'Keywords, locations and existing search performance.',       10,  false),
  ('00000000-0000-4000-8000-000000000010', 'legal_compliance',     'Legal and Compliance',  'Policies, consent and accessibility requirements.',          11,  true),
  ('00000000-0000-4000-8000-000000000010', 'final_review',         'Final Review',          'Confirm everything before we begin.',                        12,  true)
on conflict (template_id, key) do nothing;

-- --- Example maintenance tiers ----------------------------------------------
-- EXAMPLES ONLY. Nothing in the application depends on these names, prices or
-- allowances; an administrator can add, edit, reorder or retire tiers freely.
insert into public.maintenance_plans (
  slug, name, description, monthly_price, annual_price, currency,
  included_services, included_change_minutes, included_support_minutes,
  response_time_hours, priority_level, billing_frequency, renewal_period_months,
  is_active, is_public, position
)
values
  (
    'essential', 'Essential',
    'Keeps the website secure, backed up and monitored.',
    45.00, 486.00, 'GBP',
    array['Website uptime monitoring','Security updates','Plugin and package updates','Routine backups','Basic technical support'],
    0, 60, 48, 3, 'monthly', 12, true, true, 1
  ),
  (
    'professional', 'Professional',
    'Everything in Essential, plus a monthly allowance for website changes.',
    95.00, 1026.00, 'GBP',
    array['Everything in Essential','Monthly website changes','Performance monitoring','Priority support','Monthly health report'],
    120, 120, 24, 2, 'monthly', 12, true, true, 2
  ),
  (
    'premium', 'Premium',
    'A larger change allowance with priority development and SEO checks.',
    185.00, 1998.00, 'GBP',
    array['Everything in Professional','Larger monthly change allowance','Priority development queue','Content updates','Monthly SEO checks','Monthly consultation call','Enhanced monitoring'],
    300, 240, 8, 1, 'monthly', 12, true, true, 3
  )
on conflict (slug) do nothing;

-- --- Default handover checklist ---------------------------------------------
insert into public.handover_template_items (title, description, position)
values
  ('Domain confirmed',            'Ownership and renewal date verified with the client.',       1),
  ('DNS configured',              'Records point to production and are documented.',            2),
  ('SSL active',                  'Certificate issued, valid and auto-renewing.',               3),
  ('Production hosting configured','Plan, resources and access confirmed.',                     4),
  ('Backups configured',          'Schedule, retention and restore process tested.',            5),
  ('Analytics configured',        'Tracking installed and reporting correctly.',                6),
  ('Search Console configured',   'Property verified and sitemap submitted.',                   7),
  ('Contact forms tested',        'Every form submits and routes to the right inbox.',          8),
  ('Email delivery tested',       'Transactional email arrives and passes SPF/DKIM.',           9),
  ('Mobile testing complete',     'Checked across common phone and tablet sizes.',             10),
  ('Browser testing complete',    'Checked in current Chrome, Safari, Firefox and Edge.',      11),
  ('Accessibility review complete','Keyboard, contrast and semantics reviewed.',               12),
  ('Performance review complete', 'Core Web Vitals measured and acceptable.',                  13),
  ('Client approval received',    'Formal acceptance recorded in the portal.',                 14),
  ('Training completed',          'Walkthrough delivered or recorded for the client.',         15),
  ('Maintenance plan confirmed',  'Ongoing arrangement agreed and activated.',                 16)
on conflict do nothing;

-- ===========================================================================
-- Done.
--
-- Next: create your first login.
--   GitHub  -> Actions -> "Seed demo data" -> Run workflow
--   Locally -> node scripts/seed-demo.mjs
-- ===========================================================================
