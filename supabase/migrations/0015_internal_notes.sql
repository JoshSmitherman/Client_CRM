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
