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
