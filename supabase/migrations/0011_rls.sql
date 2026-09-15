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

create policy organisations_select on public.organisations
  for select to authenticated
  using (public.is_agency() or id = public.current_organisation_id());

create policy organisations_write on public.organisations
  for all to authenticated
  using (public.is_agency_manager())
  with check (public.is_agency_manager());

-- A user always sees themselves; agency users see all staff and client contacts
-- they can reach; client users see colleagues in their own organisation only.
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_agency()
    or (organisation_id is not null and organisation_id = public.current_organisation_id())
  );

-- Self-service profile edits. Role and organisation changes are blocked here by
-- the companion trigger below; only an admin may alter those columns.
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

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

create trigger users_guard_privileges
  before update on public.users
  for each row execute function public.guard_user_privileges();

create policy agency_settings_select on public.agency_settings
  for select to authenticated using (true);

create policy agency_settings_write on public.agency_settings
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

-- Agency admins manage all invitations; a client_owner may invite colleagues
-- into their own organisation only, and only with client roles.
create policy invitations_select on public.invitations
  for select to authenticated
  using (
    public.is_agency()
    or organisation_id = public.current_organisation_id()
  );

create policy invitations_agency_write on public.invitations
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

create policy invitations_client_owner_insert on public.invitations
  for insert to authenticated
  with check (
    public.current_app_role() = 'client_owner'
    and organisation_id = public.current_organisation_id()
    and role in ('client_owner', 'client_member')
  );

create policy invitations_client_owner_revoke on public.invitations
  for update to authenticated
  using (
    public.current_app_role() = 'client_owner'
    and organisation_id = public.current_organisation_id()
  )
  with check (
    public.current_app_role() = 'client_owner'
    and organisation_id = public.current_organisation_id()
    and role in ('client_owner', 'client_member')
  );

-- ---------------------------------------------------------------------------
-- CRM
-- ---------------------------------------------------------------------------

create policy clients_select on public.clients
  for select to authenticated
  using (deleted_at is null and public.can_access_client(id));

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_agency_manager());

create policy clients_update on public.clients
  for update to authenticated
  using (public.is_agency() and public.can_access_client(id))
  with check (public.is_agency() and public.can_access_client(id));

create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_agency_admin());

-- ---------------------------------------------------------------------------
-- Lifecycle + projects
-- ---------------------------------------------------------------------------

create policy lifecycle_stages_select on public.lifecycle_stages
  for select to authenticated using (true);

create policy lifecycle_stages_write on public.lifecycle_stages
  for all to authenticated
  using (public.is_agency_admin())
  with check (public.is_agency_admin());

create policy projects_select on public.projects
  for select to authenticated
  using (deleted_at is null and public.can_access_project(id));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_agency() and public.can_access_client(client_id));

create policy projects_update on public.projects
  for update to authenticated
  using (public.can_edit_project(id))
  with check (public.can_edit_project(id));

create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_agency_admin());

create policy project_members_select on public.project_members
  for select to authenticated
  using (public.can_access_project(project_id));

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
    execute format($f$
      create policy %1$s_select on public.%1$I
        for select to authenticated
        using (public.can_access_project(project_id));
    $f$, t);

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

create policy onboarding_templates_select on public.onboarding_templates
  for select to authenticated using (public.is_agency());

create policy onboarding_templates_write on public.onboarding_templates
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

create policy onboarding_template_sections_select on public.onboarding_template_sections
  for select to authenticated using (public.is_agency());

create policy onboarding_template_sections_write on public.onboarding_template_sections
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

create policy onboarding_sections_select on public.onboarding_sections
  for select to authenticated
  using (public.can_access_project(project_id));

create policy onboarding_sections_agency_write on public.onboarding_sections
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- A client may fill in their own project's sections, but only while the section
-- is still theirs to edit — never once it is submitted or approved.
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

create policy onboarding_items_select on public.onboarding_items
  for select to authenticated
  using (public.can_access_project(project_id));

create policy onboarding_items_agency_write on public.onboarding_items
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

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

create policy website_pages_select on public.website_pages
  for select to authenticated
  using (deleted_at is null and public.can_access_project(project_id));

create policy website_pages_agency_write on public.website_pages
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- Clients submit and revise page content until it is approved.
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

create policy files_agency_update on public.files
  for update to authenticated
  using (project_id is not null and public.can_edit_project(project_id))
  with check (project_id is not null and public.can_edit_project(project_id));

create policy files_owner_update on public.files
  for update to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

create policy files_delete on public.files
  for delete to authenticated
  using (public.is_agency_manager());

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create policy tasks_select on public.tasks
  for select to authenticated
  using (
    deleted_at is null
    and public.can_access_project(project_id)
    and (public.is_agency() or is_client_visible)
  );

create policy tasks_agency_write on public.tasks
  for all to authenticated
  using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- Clients may progress tasks that are explicitly their responsibility.
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

create policy comments_author_update on public.comments
  for update to authenticated
  using (author_id = auth.uid() and deleted_at is null)
  with check (author_id = auth.uid() and (public.is_agency() or not is_internal));

create policy comments_delete on public.comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_agency_admin());

-- ---------------------------------------------------------------------------
-- Approvals (append-only)
-- ---------------------------------------------------------------------------

create policy approvals_select on public.approvals
  for select to authenticated
  using (
    (project_id is not null and public.can_access_project(project_id))
    or (project_id is null and public.can_access_client(client_id))
  );

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

create policy change_requests_select on public.change_requests
  for select to authenticated
  using (deleted_at is null and public.can_access_project(project_id));

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
        and internal_notes is null
      )
    )
  );

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

create policy cra_select on public.change_request_approvals
  for select to authenticated
  using (exists (
    select 1 from public.change_requests cr
    where cr.id = change_request_id and public.can_access_project(cr.project_id)
  ));

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

create policy support_requests_select on public.support_requests
  for select to authenticated
  using (deleted_at is null and public.can_access_client(client_id));

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
        and internal_notes is null
        and covered_by_plan is null
      )
    )
  );

create policy support_requests_agency_write on public.support_requests
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

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
create policy maintenance_plans_select on public.maintenance_plans
  for select to authenticated
  using (public.is_agency() or (is_active and is_public));

create policy maintenance_plans_write on public.maintenance_plans
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

create policy subscriptions_select on public.maintenance_subscriptions
  for select to authenticated
  using (deleted_at is null and public.can_access_client(client_id));

-- Clients never write to a subscription. They raise a plan request instead.
create policy subscriptions_write on public.maintenance_subscriptions
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

create policy usage_select on public.maintenance_usage
  for select to authenticated
  using (public.can_access_client(client_id));

create policy usage_write on public.maintenance_usage
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

create policy maintenance_events_select on public.maintenance_events
  for select to authenticated
  using (exists (
    select 1 from public.maintenance_subscriptions s
    where s.id = subscription_id and public.can_access_client(s.client_id)
  ));

create policy maintenance_events_insert on public.maintenance_events
  for insert to authenticated
  with check (public.is_agency());
-- No UPDATE/DELETE: subscription history is immutable.

create policy plan_requests_select on public.maintenance_plan_requests
  for select to authenticated
  using (public.can_access_client(client_id));

create policy plan_requests_client_insert on public.maintenance_plan_requests
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and public.can_access_client(client_id)
    and (public.is_agency() or (client_id = public.current_client_id() and status = 'pending'))
  );

create policy plan_requests_agency_write on public.maintenance_plan_requests
  for all to authenticated
  using (public.is_agency() and public.can_access_client(client_id))
  with check (public.is_agency() and public.can_access_client(client_id));

-- A client may withdraw their own pending request, nothing more.
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
create policy reminders_select on public.renewal_reminders
  for select to authenticated using (public.is_agency());

create policy reminders_write on public.renewal_reminders
  for all to authenticated
  using (public.is_agency()) with check (public.is_agency());

-- ---------------------------------------------------------------------------
-- Handover documents visibility + client acceptance
-- ---------------------------------------------------------------------------

-- Replace the generic handover_documents read policy with one that honours
-- visible_to_client.
drop policy if exists handover_documents_select on public.handover_documents;
create policy handover_documents_select on public.handover_documents
  for select to authenticated
  using (
    public.can_access_project(project_id)
    and (public.is_agency() or visible_to_client)
  );

create policy handover_template_items_select on public.handover_template_items
  for select to authenticated using (public.is_agency());

create policy handover_template_items_write on public.handover_template_items
  for all to authenticated
  using (public.is_agency_admin()) with check (public.is_agency_admin());

create policy client_acceptances_select on public.client_acceptances
  for select to authenticated
  using (public.can_access_project(project_id));

-- Only a client_owner may formally accept, and only for their own project.
create policy client_acceptances_insert on public.client_acceptances
  for insert to authenticated
  with check (
    approved_by = auth.uid()
    and public.can_access_project(project_id)
    and public.current_app_role() = 'client_owner'
  );
-- No UPDATE/DELETE: acceptance is permanent.

-- ---------------------------------------------------------------------------
-- System tables
-- ---------------------------------------------------------------------------

create policy notifications_select on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Recipients may only mark their own notifications read.
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.is_agency() or user_id = auth.uid());

create policy notifications_delete on public.notifications
  for delete to authenticated using (user_id = auth.uid());

create policy activity_select on public.activity_logs
  for select to authenticated
  using (
    (
      (project_id is not null and public.can_access_project(project_id))
      or (project_id is null and client_id is not null and public.can_access_client(client_id))
    )
    and (public.is_agency() or visibility = 'client')
  );

create policy activity_insert on public.activity_logs
  for insert to authenticated
  with check (
    (project_id is not null and public.can_access_project(project_id))
    or (project_id is null and client_id is not null and public.can_access_client(client_id))
  );
-- No UPDATE/DELETE: the activity feed is permanent.

create policy audit_select on public.audit_logs
  for select to authenticated using (public.is_agency_admin());
-- No INSERT/UPDATE/DELETE policies at all.
-- Rows are written exclusively through public.record_audit().
