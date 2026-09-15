-- ===========================================================================
-- 0008  Website handover, checklists, documents, formal client acceptance
-- ===========================================================================

-- --- handovers (1:1 with project) -------------------------------------------
-- Technical reference material for the finished website.
-- NOTE: no credential columns exist by design. Passwords are never stored here.
create table public.handovers (
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

create trigger handovers_set_updated_at
  before update on public.handovers
  for each row execute function public.set_updated_at();

comment on table public.handovers is
  'Handover reference data. Credentials are deliberately absent — they are shared '
  'through the agency''s secure credential-sharing process, never stored in this system.';

-- --- handover_checklists -----------------------------------------------------
create table public.handover_checklists (
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

create index handover_checklists_handover_idx on public.handover_checklists (handover_id, position);

create trigger handover_checklists_set_updated_at
  before update on public.handover_checklists
  for each row execute function public.set_updated_at();

-- --- handover_items ----------------------------------------------------------
create table public.handover_items (
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

create index handover_items_checklist_idx on public.handover_items (checklist_id, position);
create index handover_items_project_idx on public.handover_items (project_id);

create trigger handover_items_set_updated_at
  before update on public.handover_items
  for each row execute function public.set_updated_at();

-- --- handover_documents ------------------------------------------------------
-- Stays available to the client indefinitely after project completion.
create table public.handover_documents (
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

create index handover_documents_handover_idx on public.handover_documents (handover_id, position);
create index handover_documents_project_idx on public.handover_documents (project_id);

create trigger handover_documents_set_updated_at
  before update on public.handover_documents
  for each row execute function public.set_updated_at();

-- --- client_acceptances ------------------------------------------------------
-- Append-only formal sign-off. Part of the permanent audit history.
create table public.client_acceptances (
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

create index client_acceptances_project_idx on public.client_acceptances (project_id, accepted_at desc);

-- --- handover_template_items -------------------------------------------------
-- The default checklist new handovers are instantiated from. Agency-editable,
-- so "customise the checklist" is a data change rather than a code change.
create table public.handover_template_items (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  position     integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index handover_template_items_position_idx
  on public.handover_template_items (position) where is_active;

create trigger handover_template_items_set_updated_at
  before update on public.handover_template_items
  for each row execute function public.set_updated_at();
