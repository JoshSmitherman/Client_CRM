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
