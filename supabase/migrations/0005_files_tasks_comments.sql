-- ===========================================================================
-- 0005  Media library, tasks, threaded comments, approvals
-- ===========================================================================

-- --- files -------------------------------------------------------------------
create table public.files (
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

create index files_project_idx on public.files (project_id, created_at desc) where deleted_at is null;
create index files_client_idx on public.files (client_id) where deleted_at is null;
create index files_page_idx on public.files (website_page_id) where deleted_at is null;
create index files_section_idx on public.files (onboarding_section_id) where deleted_at is null;
create index files_approval_idx on public.files (approval_status) where deleted_at is null;

create trigger files_set_updated_at
  before update on public.files
  for each row execute function public.set_updated_at();

-- Deferred FK from 0004.
alter table public.onboarding_items
  add constraint onboarding_items_file_id_fkey
  foreign key (file_id) references public.files (id) on delete set null;

-- --- tasks -------------------------------------------------------------------
create table public.tasks (
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

create index tasks_project_idx on public.tasks (project_id, status) where deleted_at is null;
create index tasks_assignee_idx on public.tasks (assignee_id) where deleted_at is null;
create index tasks_overdue_idx on public.tasks (due_date)
  where status <> 'complete' and deleted_at is null;
create index tasks_section_idx on public.tasks (onboarding_section_id) where deleted_at is null;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- --- comments ----------------------------------------------------------------
-- Polymorphic threads. `project_id` is denormalised purely so RLS can be a
-- cheap index lookup rather than a recursive join per entity type.
create table public.comments (
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

create index comments_entity_idx on public.comments (entity_type, entity_id, created_at)
  where deleted_at is null;
create index comments_project_idx on public.comments (project_id, created_at desc)
  where deleted_at is null;
create index comments_parent_idx on public.comments (parent_id) where deleted_at is null;

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

-- --- approvals ---------------------------------------------------------------
-- Append-only record of approve / reject / request-changes decisions.
create table public.approvals (
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

create index approvals_entity_idx on public.approvals (entity_type, entity_id, created_at desc);
create index approvals_project_idx on public.approvals (project_id, created_at desc);
