-- ===========================================================================
-- Row Level Security assertions
-- ===========================================================================
-- Run by scripts/verify-schema.sh. Each block raises on failure, so the script
-- exits non-zero if the security boundary regresses.
--
-- Impersonation works the way PostgREST does it: SET ROLE authenticated and
-- set request.jwt.claim.sub to the user's id.
-- ===========================================================================

\set ON_ERROR_STOP on

-- --------------------------------------------------------------------------
-- Fixtures (inserted as superuser, bypassing RLS)
-- --------------------------------------------------------------------------
-- The very first account to sign up becomes the agency administrator, so a
-- fresh installation is usable without running a script.
\echo '--- bootstrap ---'
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'admin@northpoint.test');

do $$
declare v_role public.app_role; v_active boolean; v_org uuid;
begin
  select role, is_active, organisation_id into v_role, v_active, v_org
  from public.users where id = '11111111-1111-4111-8111-111111111111';

  if v_role <> 'agency' or not v_active or v_org is null then
    raise exception 'RLS ASSERTION FAILED: the first signup did not become an active administrator (role=%, active=%, org=%)',
      v_role, v_active, v_org;
  end if;
  raise notice '  pass: the first signup becomes the agency administrator';
end $$;

insert into auth.users (id, email) values
  ('22222222-2222-4222-8222-222222222222', 'dev@northpoint.test'),
  ('33333333-3333-4333-8333-333333333333', 'owner@acme.test'),
  ('44444444-4444-4444-8444-444444444444', 'owner@globex.test');

-- ...and the second signup does not, even from the same domain.
do $$
declare v_role public.app_role; v_active boolean;
begin
  select role, is_active into v_role, v_active
  from public.users where id = '22222222-2222-4222-8222-222222222222';

  if v_role = 'agency' or v_active then
    raise exception 'RLS ASSERTION FAILED: a later signup was also made an administrator';
  end if;
  raise notice '  pass: only the first signup is bootstrapped';
end $$;

insert into public.organisations (id, kind, name, slug) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'client', 'Acme Ltd',   'acme-ltd'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'client', 'Globex Ltd', 'globex-ltd');

-- handle_new_user() already created an inactive profile for each auth user
-- (no invitation existed), which is itself the behaviour we want. Promote them
-- here the way accepting an invitation would.
insert into public.users (id, email, full_name, role, organisation_id, is_active) values
  ('11111111-1111-4111-8111-111111111111', 'admin@northpoint.test', 'Agency Admin', 'agency', '00000000-0000-4000-8000-000000000001', true),
  ('22222222-2222-4222-8222-222222222222', 'dev@northpoint.test',   'Dev Person',   'agency',       '00000000-0000-4000-8000-000000000001', true),
  ('33333333-3333-4333-8333-333333333333', 'owner@acme.test',       'Acme Owner',   'client',       'aaaaaaaa-0000-4000-8000-000000000001', true),
  ('44444444-4444-4444-8444-444444444444', 'owner@globex.test',     'Globex Owner', 'client',       'bbbbbbbb-0000-4000-8000-000000000002', true)
on conflict (id) do update
  set full_name = excluded.full_name,
      role = excluded.role,
      organisation_id = excluded.organisation_id,
      is_active = true;

-- The unauthenticated-signup path must produce a profile that can see nothing.
do $$
declare v_role public.app_role; v_active boolean; v_org uuid;
begin
  insert into auth.users (id, email) values
    ('99999999-9999-4999-8999-999999999999', 'stranger@example.test');
  select role, is_active, organisation_id into v_role, v_active, v_org
  from public.users where id = '99999999-9999-4999-8999-999999999999';
  if v_active or v_org is not null then
    raise exception 'RLS ASSERTION FAILED: uninvited signup produced an active profile';
  end if;
  raise notice '  pass: uninvited signup is inactive with no organisation';
end $$;

insert into public.clients (id, organisation_id, company_name) values
  ('c1111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Acme Ltd'),
  ('c2222222-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'Globex Ltd');

insert into public.projects (id, client_id, name, project_type) values
  ('d1111111-0000-4000-8000-000000000001', 'c1111111-0000-4000-8000-000000000001', 'Acme Website',   'new_website'),
  ('d2222222-0000-4000-8000-000000000002', 'c2222222-0000-4000-8000-000000000002', 'Globex Website', 'website_redesign');

insert into public.comments (id, entity_type, entity_id, project_id, author_id, body, is_internal) values
  ('e1111111-0000-4000-8000-000000000001', 'project', 'd1111111-0000-4000-8000-000000000001',
   'd1111111-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'Client-visible update', false),
  ('e2222222-0000-4000-8000-000000000002', 'project', 'd1111111-0000-4000-8000-000000000001',
   'd1111111-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111',
   'INTERNAL: margin is thin on this one', true);

insert into public.change_requests (id, client_id, project_id, title, description, submitted_by, status)
values ('f1111111-0000-4000-8000-000000000001', 'c1111111-0000-4000-8000-000000000001',
        'd1111111-0000-4000-8000-000000000001', 'Update the homepage hero',
        'Please swap the hero image.', '33333333-3333-4333-8333-333333333333', 'submitted');

insert into public.files (id, project_id, client_id, storage_path, file_name, original_name, mime_type, size_bytes, uploaded_by)
values ('a9111111-0000-4000-8000-000000000001', 'd1111111-0000-4000-8000-000000000001',
        'c1111111-0000-4000-8000-000000000001', 'projects/d1111111-0000-4000-8000-000000000001/logo.svg',
        'logo.svg', 'logo.svg', 'image/svg+xml', 2048, '33333333-3333-4333-8333-333333333333');

-- Helper: assert a condition or fail loudly.
create or replace function pg_temp.assert(p_condition boolean, p_label text)
returns void language plpgsql as $$
begin
  if p_condition is not true then
    raise exception 'RLS ASSERTION FAILED: %', p_label;
  end if;
  raise notice '  pass: %', p_label;
end;
$$;

-- --------------------------------------------------------------------------
-- 1. Tenant isolation — a client sees only their own organisation
-- --------------------------------------------------------------------------
\echo '--- client tenant isolation ---'
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

select pg_temp.assert(
  (select count(*) from public.projects) = 1,
  'Acme owner sees exactly one project');

select pg_temp.assert(
  (select count(*) from public.projects where id = 'd2222222-0000-4000-8000-000000000002') = 0,
  'Acme owner cannot see the Globex project');

select pg_temp.assert(
  (select count(*) from public.clients) = 1,
  'Acme owner sees only their own client record');

select pg_temp.assert(
  (select count(*) from public.change_requests) = 1,
  'Acme owner sees only their own change requests');

-- --------------------------------------------------------------------------
-- 2. Internal comments are invisible to clients
-- --------------------------------------------------------------------------
\echo '--- internal comment visibility ---'
select pg_temp.assert(
  (select count(*) from public.comments) = 1,
  'client sees the public comment but not the internal note');

select pg_temp.assert(
  (select count(*) from public.comments where is_internal) = 0,
  'no internal comment is readable by a client under any filter');

-- A client cannot author an internal note either.
do $$
begin
  insert into public.comments (entity_type, entity_id, project_id, author_id, body, is_internal)
  values ('project', 'd1111111-0000-4000-8000-000000000001',
          'd1111111-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333',
          'sneaky internal', true);
  raise exception 'RLS ASSERTION FAILED: client was able to write an internal comment';
exception
  when insufficient_privilege then raise notice '  pass: client cannot write an internal comment';
end $$;

-- --------------------------------------------------------------------------
-- 3. Cross-tenant write is refused
-- --------------------------------------------------------------------------
\echo '--- cross-tenant write ---'
do $$
begin
  insert into public.change_requests (client_id, project_id, title, description, submitted_by)
  values ('c2222222-0000-4000-8000-000000000002', 'd2222222-0000-4000-8000-000000000002',
          'Injected', 'Should be refused', '33333333-3333-4333-8333-333333333333');
  raise exception 'RLS ASSERTION FAILED: client wrote into another tenant''s project';
exception
  when insufficient_privilege then raise notice '  pass: cross-tenant change request refused';
end $$;

-- --------------------------------------------------------------------------
-- 4. Column guards — a client cannot set commercial fields
-- --------------------------------------------------------------------------
\echo '--- column guards ---'
do $$
begin
  update public.change_requests
  set estimated_cost = 0, billing_treatment = 'included_in_plan'
  where id = 'f1111111-0000-4000-8000-000000000001';
  raise exception 'RLS ASSERTION FAILED: client set commercial fields on a change request';
exception
  when raise_exception then
    if sqlerrm like 'RLS ASSERTION FAILED%' then raise;
    end if;
    raise notice '  pass: client cannot set commercial fields';
end $$;

-- ...but may still correct their own description while it is untriaged.
update public.change_requests
set description = 'Please swap the hero image for the new one.'
where id = 'f1111111-0000-4000-8000-000000000001';

select pg_temp.assert(
  (select description from public.change_requests where id = 'f1111111-0000-4000-8000-000000000001')
    like '%new one%',
  'client can still edit their own untriaged request');

-- A client cannot approve their own upload.
do $$
begin
  update public.files set approval_status = 'approved'
  where id = 'a9111111-0000-4000-8000-000000000001';
  raise exception 'RLS ASSERTION FAILED: client approved their own file';
exception
  when raise_exception then
    if sqlerrm like 'RLS ASSERTION FAILED%' then raise;
    end if;
    raise notice '  pass: client cannot approve their own file';
end $$;

-- --------------------------------------------------------------------------
-- 4b. Change request state transitions
-- --------------------------------------------------------------------------
\echo '--- change request transitions ---'

-- A client must not be able to skip triage by approving their own request.
do $$
begin
  update public.change_requests set status = 'approved'
  where id = 'f1111111-0000-4000-8000-000000000001';
  raise exception 'RLS ASSERTION FAILED: client skipped triage by self-approving';
exception
  when raise_exception then
    if sqlerrm like 'RLS ASSERTION FAILED%' then raise;
    end if;
    raise notice '  pass: client cannot jump submitted -> approved';
end $$;

-- Withdrawing their own untriaged request is allowed.
update public.change_requests set status = 'cancelled'
where id = 'f1111111-0000-4000-8000-000000000001';

select pg_temp.assert(
  (select status from public.change_requests where id = 'f1111111-0000-4000-8000-000000000001')
    = 'cancelled',
  'client can cancel their own untriaged request');

-- Put the request in front of the client as the agency would, then check the
-- decision they are entitled to make. The claim is cleared first: the guards
-- key off auth.uid(), so leaving it set would make even the superuser look
-- like the client.
reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.change_requests set status = 'awaiting_client_approval'
where id = 'f1111111-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

update public.change_requests set status = 'approved'
where id = 'f1111111-0000-4000-8000-000000000001';

select pg_temp.assert(
  (select status from public.change_requests where id = 'f1111111-0000-4000-8000-000000000001')
    = 'approved',
  'client can approve a quotation put to them');

-- ...but cannot then declare the work finished. An 'approved' row falls outside
-- the client UPDATE policy entirely, so RLS filters it out and the statement
-- affects no rows rather than raising — which is why this is asserted on the
-- resulting state rather than on an exception.
update public.change_requests set status = 'completed'
where id = 'f1111111-0000-4000-8000-000000000001';

select pg_temp.assert(
  (select status from public.change_requests where id = 'f1111111-0000-4000-8000-000000000001')
    = 'approved',
  'client cannot mark an approved request completed');

-- --------------------------------------------------------------------------
-- 5. Privilege escalation is impossible
-- --------------------------------------------------------------------------
\echo '--- privilege escalation ---'
do $$
begin
  update public.users set role = 'agency'
  where id = '33333333-3333-4333-8333-333333333333';
  raise exception 'RLS ASSERTION FAILED: client escalated their own role';
exception
  when raise_exception then
    if sqlerrm like 'RLS ASSERTION FAILED%' then raise;
    end if;
    raise notice '  pass: client cannot change their own role';
end $$;

-- --------------------------------------------------------------------------
-- 6. Audit log is append-only and agency-admin readable only
-- --------------------------------------------------------------------------
\echo '--- audit log ---'
do $$
begin
  insert into public.audit_logs (action, entity_type, entity_id)
  values ('forged', 'project', 'd1111111-0000-4000-8000-000000000001');
  raise exception 'RLS ASSERTION FAILED: direct insert into audit_logs succeeded';
exception
  when insufficient_privilege then raise notice '  pass: audit_logs rejects direct inserts';
end $$;

select pg_temp.assert(
  (select count(*) from public.audit_logs) = 0,
  'client cannot read the audit log');

-- record_audit() is the only way in, and it works for an authenticated caller.
select public.record_audit('test.action', 'project', 'd1111111-0000-4000-8000-000000000001');

-- --------------------------------------------------------------------------
-- 7. Agency scoping — one staff role means one view of the work
-- --------------------------------------------------------------------------
-- Before migration 0018 this asserted the opposite: a developer saw only the
-- projects they were a member of, and a manager saw everything. Collapsing to
-- a single agency role removes that distinction deliberately, so the assertion
-- is inverted rather than deleted — the behaviour is now a decision, not an
-- accident, and it is worth failing loudly if it ever changes back.
\echo '--- agency scoping ---'
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

select pg_temp.assert(
  (select count(*) from public.projects) = 2,
  'an agency user sees every project without being a member of it');

select pg_temp.assert(
  (select count(*) from public.clients) = 2,
  'an agency user sees every client');

reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into public.project_members (project_id, user_id)
values ('d1111111-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222')
on conflict do nothing;
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

select pg_temp.assert(
  (select count(*) from public.comments where is_internal) = 1,
  'agency user does see internal comments');

-- --------------------------------------------------------------------------
-- 8. Agency admin sees everything
-- --------------------------------------------------------------------------
\echo '--- agency admin scope ---'
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

select pg_temp.assert(
  (select count(*) from public.projects) = 2,
  'agency admin sees every project');

select pg_temp.assert(
  (select count(*) from public.clients) = 2,
  'agency admin sees every client');

select pg_temp.assert(
  (select count(*) from public.audit_logs) = 1,
  'agency admin can read the audit log');

-- --------------------------------------------------------------------------
-- 9. Anonymous access reaches nothing
-- --------------------------------------------------------------------------
\echo '--- anonymous access ---'
select set_config('request.jwt.claim.sub', '', false);

select pg_temp.assert(
  (select count(*) from public.projects) = 0,
  'a session with no user id sees no projects');

select pg_temp.assert(
  (select count(*) from public.clients) = 0,
  'a session with no user id sees no clients');

-- --------------------------------------------------------------------------
-- 10. Staff self-registration ladder
-- --------------------------------------------------------------------------
\echo '--- staff signup ---'
reset role;
select set_config('request.jwt.claim.sub', '', false);

update public.agency_settings
set staff_email_domains = array['northpoint.test'],
    staff_signup_mode = 'approval_required',
    staff_default_role = 'agency';

insert into auth.users (id, email) values
  ('55555555-5555-4555-8555-555555555555', 'pending@northpoint.test');

do $$
declare v_role public.app_role; v_active boolean; v_org uuid;
begin
  select role, is_active, organisation_id into v_role, v_active, v_org
  from public.users where id = '55555555-5555-4555-8555-555555555555';

  if v_role <> 'agency' or v_active or v_org is null then
    raise exception 'RLS ASSERTION FAILED: approval_required did not create a pending staff account (role=%, active=%, org=%)',
      v_role, v_active, v_org;
  end if;
  raise notice '  pass: an allow-listed domain awaits approval when that mode is set';
end $$;

update public.agency_settings set staff_signup_mode = 'domain_allowlist';

insert into auth.users (id, email) values
  ('66666666-6666-4666-8666-666666666666', 'auto@northpoint.test');

do $$
declare v_role public.app_role; v_active boolean;
begin
  select role, is_active into v_role, v_active
  from public.users where id = '66666666-6666-4666-8666-666666666666';

  if v_role <> 'agency' or not v_active then
    raise exception 'RLS ASSERTION FAILED: domain_allowlist did not activate the staff account';
  end if;
  raise notice '  pass: an allow-listed domain is active immediately in that mode';
end $$;

-- A stranger gets nothing, whatever the mode.
insert into auth.users (id, email) values
  ('77777777-7777-4777-8777-777777777777', 'stranger@somewhere-else.test');

do $$
declare v_active boolean; v_org uuid;
begin
  select is_active, organisation_id into v_active, v_org
  from public.users where id = '77777777-7777-4777-8777-777777777777';

  if v_active or v_org is not null then
    raise exception 'RLS ASSERTION FAILED: an unrecognised domain gained access';
  end if;
  raise notice '  pass: an unrecognised domain gets no access at all';
end $$;

-- A pending staff member can reach nothing until an administrator activates them.
set role authenticated;
select set_config('request.jwt.claim.sub', '55555555-5555-4555-8555-555555555555', false);

select pg_temp.assert(
  (select count(*) from public.projects) = 0,
  'a staff account awaiting approval sees no projects');

select pg_temp.assert(
  (select count(*) from public.clients) = 0,
  'a staff account awaiting approval sees no clients');

-- An invitation still wins over the domain rules.
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.invitations (email, role, organisation_id)
values ('invited@northpoint.test', 'agency', '00000000-0000-4000-8000-000000000001');

insert into auth.users (id, email) values
  ('88888888-8888-4888-8888-888888888888', 'invited@northpoint.test');

do $$
declare v_role public.app_role; v_active boolean;
begin
  select role, is_active into v_role, v_active
  from public.users where id = '88888888-8888-4888-8888-888888888888';

  if v_role <> 'agency' or not v_active then
    raise exception 'RLS ASSERTION FAILED: the invitation did not take precedence over the domain rule';
  end if;
  raise notice '  pass: an invitation overrides the domain default';
end $$;

-- --------------------------------------------------------------------------
-- 11. Agency-only text is unreachable, not merely unrendered
-- --------------------------------------------------------------------------
-- RLS restricts rows, not columns, so anything agency-only that sits on a
-- client-readable row is readable straight from the API. These assertions
-- prove it is not on those rows at all.
\echo '--- internal notes ---'
reset role;
select set_config('request.jwt.claim.sub', '', false);

insert into public.internal_notes (entity_type, entity_id, project_id, client_id, body)
values
  ('change_request', 'f1111111-0000-4000-8000-000000000001',
   'd1111111-0000-4000-8000-000000000001', 'c1111111-0000-4000-8000-000000000001',
   'PRIVATE: quote them double'),
  ('client', 'c1111111-0000-4000-8000-000000000001', null,
   'c1111111-0000-4000-8000-000000000001', 'PRIVATE: they always pay late');

insert into public.project_risks (project_id, title, description)
values ('d1111111-0000-4000-8000-000000000001', 'Client may not pay', 'Slow payer historically.');

set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

select pg_temp.assert(
  (select count(*) from public.internal_notes) = 0,
  'client cannot read any internal note, on their own records or otherwise');

select pg_temp.assert(
  (select count(*) from public.project_risks) = 0,
  'client cannot read the risk register for their own project');

select pg_temp.assert(
  (select count(*) from public.invitations) = 0,
  'client cannot read invitations or their tokens');

-- Writing one is refused too, so a client cannot plant text an agency user
-- would later read as its own note.
do $$
begin
  insert into public.internal_notes (entity_type, entity_id, client_id, body)
  values ('client', 'c1111111-0000-4000-8000-000000000001',
          'c1111111-0000-4000-8000-000000000001', 'injected');
  raise exception 'RLS ASSERTION FAILED: client wrote an internal note';
exception
  when insufficient_privilege then raise notice '  pass: client cannot write an internal note';
end $$;

-- The agency can read and write them normally.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

select pg_temp.assert(
  (select count(*) from public.internal_notes) = 2,
  'agency admin reads internal notes');

select pg_temp.assert(
  (select count(*) from public.project_risks) = 1,
  'agency admin reads the risk register');

-- A handover still being prepared is not visible to the client.
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into public.handovers (project_id, status) values
  ('d1111111-0000-4000-8000-000000000001', 'draft');

set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

select pg_temp.assert(
  (select count(*) from public.handovers) = 0,
  'client cannot see a handover that is still in draft');

reset role;
select set_config('request.jwt.claim.sub', '', false);
update public.handovers set status = 'delivered'
where project_id = 'd1111111-0000-4000-8000-000000000001';

set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

select pg_temp.assert(
  (select count(*) from public.handovers) = 1,
  'client can see the handover once it is delivered');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- --------------------------------------------------------------------------
-- The public signup screen
-- --------------------------------------------------------------------------
-- staff_signup_hints() exists so a signed-out visitor can be told which email
-- address to use. It is the only thing anon may call, and it must not become a
-- way around the settings table it reads from.
set role anon;

select pg_temp.assert(
  (select count(*) from public.staff_signup_hints()) = 1,
  'anon can read the signup hints');

-- An installation with an administrator is not a first-run installation.
select pg_temp.assert(
  (select not is_first_account from public.staff_signup_hints()),
  'the hints report that this installation already has an administrator');

-- Everything else about the settings stays out of reach.
select pg_temp.assert(
  (select count(*) from public.agency_settings) = 0,
  'anon still cannot read agency_settings directly');

select pg_temp.assert(
  (select count(*) from public.users) = 0,
  'anon still cannot read users');

reset role;
select set_config('request.jwt.claim.sub', '', false);

-- --------------------------------------------------------------------------
-- Permanent deletion
-- --------------------------------------------------------------------------
-- Deleting a client cascades to its projects, files, requests and
-- subscriptions, so who can do it is worth asserting rather than assuming.
--
-- Migration 0017 widened this from administrators to project managers; 0018
-- then collapsed the agency roles into one, so today it means every agency
-- user and no client. That is a real increase in blast radius and the reason
-- these assertions exist: if a client ever gains this, the build fails.

-- A client cannot delete their own organisation's record, nor its projects.
set role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', false);

select pg_temp.assert(
  (select count(*) from public.clients) = 1,
  'a client can see their own record');

delete from public.clients where id = 'c1111111-0000-4000-8000-000000000001';

select pg_temp.assert(
  (select count(*) from public.clients where id = 'c1111111-0000-4000-8000-000000000001') = 1,
  'a client cannot delete their own organisation record');

delete from public.projects where id = 'd1111111-0000-4000-8000-000000000001';

reset role;
select set_config('request.jwt.claim.sub', '', false);

select pg_temp.assert(
  (select count(*) from public.projects where id = 'd1111111-0000-4000-8000-000000000001') = 1,
  'a client cannot delete a project');

-- An agency user can, and the cascade reaches everything hanging off it.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

delete from public.projects where id = 'd1111111-0000-4000-8000-000000000001';

select pg_temp.assert(
  (select count(*) from public.projects where id = 'd1111111-0000-4000-8000-000000000001') = 0,
  'an agency user can delete a project');

select pg_temp.assert(
  (select count(*) from public.tasks where project_id = 'd1111111-0000-4000-8000-000000000001') = 0,
  'deleting a project takes its tasks with it');

reset role;
\echo 'ALL RLS ASSERTIONS PASSED'
