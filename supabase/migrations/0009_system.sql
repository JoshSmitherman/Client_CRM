-- ===========================================================================
-- 0009  Notifications, activity feed, audit log
-- ===========================================================================

-- --- notifications -----------------------------------------------------------
-- In-app only for now. `delivered_email_at` is present so an email transport
-- can be layered on later without a migration.
create table public.notifications (
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

create index notifications_user_unread_idx on public.notifications (user_id, created_at desc)
  where not is_read;
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- --- activity_logs -----------------------------------------------------------
-- The chronological project feed and the per-request timeline. Never deleted.
create table public.activity_logs (
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

create index activity_project_idx on public.activity_logs (project_id, created_at desc);
create index activity_client_idx on public.activity_logs (client_id, created_at desc);
create index activity_entity_idx on public.activity_logs (entity_type, entity_id, created_at desc);

-- --- audit_logs --------------------------------------------------------------
-- Insert-only. No UPDATE or DELETE policy is ever created for this table,
-- so not even an agency admin can rewrite the record through PostgREST.
create table public.audit_logs (
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

create index audit_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_created_idx on public.audit_logs (created_at desc);

comment on table public.audit_logs is
  'Append-only. Deliberately has no UPDATE or DELETE RLS policy.';
