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
    (select u.role not in ('client_owner', 'client_member')
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
    (select u.role = 'agency_admin'
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
    (select u.role in ('agency_admin', 'project_manager')
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
    (select u.role in ('client_owner', 'client_member')
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
    and u.role in ('client_owner', 'client_member')
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
