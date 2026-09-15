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
     or new.internal_notes is distinct from old.internal_notes
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
     or new.internal_notes is distinct from old.internal_notes
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

create trigger change_requests_guard_transition
  before update of status on public.change_requests
  for each row execute function public.guard_change_request_transition();
