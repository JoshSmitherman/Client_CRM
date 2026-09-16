-- ===========================================================================
-- Deleting a client or a project is a project manager's job
-- ===========================================================================
-- Both delete policies were written for agency administrators only. The
-- agency's own answer is that a project manager should be able to do it, so
-- these widen to is_agency_manager() — which is 'agency_admin' or
-- 'project_manager', and nobody else.
--
-- A developer, designer, QA or support agent still cannot, and neither can any
-- client role. Widening here rather than in the application matters: the
-- policy is what actually decides, and a browser that asked anyway would still
-- be refused.
--
-- The rest of the schema is unchanged. Soft deletion remains how records are
-- normally retired; this governs the permanent kind.
-- ===========================================================================

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_agency_manager());

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_agency_manager());

comment on policy clients_delete on public.clients is
  'Permanent deletion, cascading to projects, files, requests and subscriptions. '
  'Project managers and administrators only.';

comment on policy projects_delete on public.projects is
  'Permanent deletion, cascading to tasks, content, comments and handover. '
  'Project managers and administrators only.';
