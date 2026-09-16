-- ===========================================================================
-- Two account types: agency and client
-- ===========================================================================
-- app_role carried nine values — seven agency roles and two client ones —
-- because the original brief asked for room to grow into them. The agency's
-- answer, having used it, is that there are two kinds of account: people who
-- work here, and people we work for. So the enum now says exactly that.
--
-- The policies are almost entirely untouched. All ~105 of them are written
-- against is_agency(), is_agency_admin(), is_agency_manager() and is_client()
-- rather than against role literals, so redefining those four functions moves
-- the whole permission model at once. That was worth the indirection.
--
-- What changes in substance, stated plainly because collapsing roles cannot be
-- neutral:
--
--   Every agency user now has what an administrator had. They can change
--   agency settings, approve new staff, and permanently delete a client or a
--   project. Previously a developer could do none of those. That is the
--   consequence of having one staff role, not an oversight.
--
--   A client can no longer invite their own colleagues. The two policies that
--   allowed a 'client_owner' to do so had no meaning once there is a single
--   client role, and the agency issuing every client login is both simpler and
--   tighter. It is also what the brief asked for originally.
--
--   Any client user can now sign off a handover. That was a 'client_owner'
--   privilege; with one client role it belongs to all of them.
--
-- Existing accounts are mapped, not dropped: the seven agency roles all become
-- 'agency' and both client roles become 'client'. Nobody loses access and
-- nobody has to be re-invited.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- 1. Remove what depends on the old type
-- --------------------------------------------------------------------------
-- These three policies test current_app_role() against a literal, so they hold
-- the function, which holds the type. Two of them are gone for good; the
-- acceptance one is rebuilt below.
drop policy if exists invitations_client_owner_insert on public.invitations;
drop policy if exists invitations_client_owner_revoke on public.invitations;
drop policy if exists client_acceptances_insert on public.client_acceptances;

drop function if exists public.current_app_role();

-- The partial index names the client roles in its predicate.
drop index if exists public.users_active_agency_idx;

-- --------------------------------------------------------------------------
-- 2. Swap the type
-- --------------------------------------------------------------------------
-- Postgres cannot remove a value from an enum, so the type is replaced and
-- every column converted through a mapping cast.
do $$
begin
  if exists (
    select 1 from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'app_role' and e.enumlabel = 'agency_admin'
  ) then
    alter type public.app_role rename to app_role_legacy;
    create type public.app_role as enum ('agency', 'client');

    alter table public.users
      alter column role drop default,
      alter column role type public.app_role
        using (
          case when role::text in ('client_owner', 'client_member')
               then 'client' else 'agency' end
        )::public.app_role,
      alter column role set default 'client';

    alter table public.invitations
      alter column role type public.app_role
        using (
          case when role::text in ('client_owner', 'client_member')
               then 'client' else 'agency' end
        )::public.app_role;

    alter table public.agency_settings
      alter column staff_default_role drop default,
      alter column staff_default_role type public.app_role
        using (
          case when staff_default_role::text in ('client_owner', 'client_member')
               then 'client' else 'agency' end
        )::public.app_role,
      alter column staff_default_role set default 'agency';

    drop type public.app_role_legacy;
  end if;
end $$;

create index if not exists users_active_agency_idx
  on public.users (role)
  where is_active and deleted_at is null and role = 'agency';

-- --------------------------------------------------------------------------
-- 3. Redefine the predicates the policies are written against
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

create or replace function public.is_agency()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'agency'
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
$$;

-- Kept as separate names so the policies do not have to change, and so the
-- distinctions can come back if the agency ever wants them again. Today all
-- three mean the same thing.
create or replace function public.is_agency_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_agency();
$$;

create or replace function public.is_agency_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_agency();
$$;

create or replace function public.is_client()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.role = 'client'
     from public.users u
     where u.id = auth.uid() and u.is_active and u.deleted_at is null),
    false
  );
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
    and u.role = 'client'
    and c.deleted_at is null;
$$;

-- --------------------------------------------------------------------------
-- 4. Rebuild what was dropped
-- --------------------------------------------------------------------------
-- Signing off the handover is now open to any client user rather than to the
-- one nominated administrator.
drop policy if exists client_acceptances_insert on public.client_acceptances;
create policy client_acceptances_insert on public.client_acceptances
  for insert to authenticated
  with check (
    approved_by = auth.uid()
    and public.can_access_project(project_id)
    and public.is_client()
  );

comment on table public.client_acceptances is
  'Permanent record of a client signing off a handover. No update or delete '
  'policy exists for anyone.';

-- --------------------------------------------------------------------------
-- 5. The signup ladder, in two-role terms
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite      public.invitations%rowtype;
  v_settings    public.agency_settings%rowtype;
  v_name        text;
  v_has_agency  boolean;
  v_agency_org  uuid;
  v_domain      text;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

  -- 1. A pending invitation decides everything.
  select * into v_invite
  from public.invitations
  where email = new.email
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if found then
    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, coalesce(nullif(v_name, ''), v_invite.full_name, ''),
            v_invite.role, v_invite.organisation_id, true)
    on conflict (id) do update
      set role            = excluded.role,
          organisation_id = excluded.organisation_id,
          is_active       = true;

    update public.invitations set accepted_at = now() where id = v_invite.id;

    if v_invite.client_id is not null then
      update public.clients
      set primary_contact_name = coalesce(nullif(trim(primary_contact_name), ''), v_name),
          email                = coalesce(email, new.email)
      where id = v_invite.client_id;
    end if;

    return new;
  end if;

  select * into v_settings from public.agency_settings limit 1;

  -- 2. The first account ever created runs the agency.
  select exists (
    select 1 from public.users
    where role = 'agency' and is_active and deleted_at is null
  ) into v_has_agency;

  if not v_has_agency then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, v_name, 'agency', v_agency_org, true)
    on conflict (id) do update
      set role            = 'agency',
          organisation_id = excluded.organisation_id,
          is_active       = true;

    return new;
  end if;

  -- 3. An allow-listed work email address becomes agency staff.
  v_domain := lower(split_part(new.email, '@', 2));

  if v_settings.id is not null
     and v_settings.staff_signup_mode <> 'disabled'
     and v_domain = any (
       select lower(d) from unnest(v_settings.staff_email_domains) d
     )
  then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (
      new.id, new.email, v_name, 'agency', v_agency_org,
      v_settings.staff_signup_mode = 'domain_allowlist'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- 4. Anyone else gets an account with no organisation, which can read
  --    nothing at all. This rung is what makes an open signup form safe.
  insert into public.users (id, email, full_name, role, organisation_id, is_active)
  values (new.id, new.email, v_name, 'client', null, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The public signup screen counts agency accounts, not administrators.
create or replace function public.staff_signup_hints()
returns table (
  signup_mode text,
  email_domains text[],
  is_first_account boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(s.staff_signup_mode, 'approval_required')::text,
    coalesce(s.staff_email_domains, array[]::text[]),
    not exists (
      select 1 from public.users u
      where u.role = 'agency' and u.is_active and u.deleted_at is null
    )
  from (select 1) one
  left join public.agency_settings s on true
  limit 1;
$$;

revoke all on function public.staff_signup_hints() from public;
grant execute on function public.staff_signup_hints() to anon, authenticated;
