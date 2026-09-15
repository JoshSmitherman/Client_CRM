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
