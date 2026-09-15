-- ===========================================================================
-- 0014  Staff self-registration
-- ===========================================================================
-- Agency staff register themselves through Supabase Authentication; client
-- logins are then created by staff from inside the platform.
--
-- Open signup with no gate would let anyone on the internet create an agency
-- account, so handle_new_user() now applies a ladder:
--
--   1. A pending invitation      -> exactly what the invitation says
--   2. No agency admin exists    -> this is the first account; make it the
--                                   administrator (bootstrap, once only)
--   3. Email domain allow-listed -> staff account, active or pending approval
--      by the agency                depending on the configured mode
--   4. Anything else             -> inactive, no organisation, sees nothing
--
-- Step 4 is the important one: an uninvited stranger who signs up gets an
-- account that can read nothing at all, because every RLS predicate requires
-- an active profile with an organisation.

alter table public.agency_settings
  add column if not exists staff_email_domains text[] not null default '{}',
  add column if not exists staff_signup_mode text not null default 'approval_required',
  add column if not exists staff_default_role public.app_role not null default 'project_manager';

do $$ begin
  alter table public.agency_settings
    add constraint agency_settings_staff_signup_mode_check
    check (staff_signup_mode in ('disabled', 'domain_allowlist', 'approval_required'));
exception when duplicate_object then null; end $$;

comment on column public.agency_settings.staff_email_domains is
  'Domains whose signups are treated as agency staff, e.g. {northpointdigital.co.uk}. '
  'Empty means no domain is trusted and only invitations create staff accounts.';

comment on column public.agency_settings.staff_signup_mode is
  'disabled: domain signups get no access. '
  'domain_allowlist: an allow-listed domain becomes an active staff account. '
  'approval_required: an allow-listed domain becomes a staff account awaiting activation.';

-- The agency organisation every staff account attaches to. Created on demand so
-- the first signup works even on a database where only the schema was applied.
create or replace function public.ensure_agency_organisation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_name text;
begin
  select id into v_id
  from public.organisations
  where kind = 'agency' and deleted_at is null
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  select agency_name into v_name from public.agency_settings limit 1;

  insert into public.organisations (kind, name, slug)
  values (
    'agency',
    coalesce(v_name, 'Agency'),
    -- Fixed slug: there is only ever one agency organisation.
    'agency'
  )
  on conflict (slug) do update set kind = 'agency'
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite       public.invitations%rowtype;
  v_name         text;
  v_domain       text;
  v_settings     public.agency_settings%rowtype;
  v_agency_org   uuid;
  v_has_admin    boolean;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  -- ---------------------------------------------------------------- 1. invited
  select * into v_invite
  from public.invitations
  where email = new.email
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_invite.id is not null then
    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (
      new.id,
      new.email,
      coalesce(nullif(trim(v_invite.full_name), ''), v_name),
      v_invite.role,
      v_invite.organisation_id,
      true
    )
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

  -- ------------------------------------------------------- 2. first ever account
  select exists (
    select 1 from public.users
    where role = 'agency_admin' and is_active and deleted_at is null
  ) into v_has_admin;

  if not v_has_admin then
    v_agency_org := public.ensure_agency_organisation();

    insert into public.users (id, email, full_name, role, organisation_id, is_active)
    values (new.id, new.email, v_name, 'agency_admin', v_agency_org, true)
    on conflict (id) do update
      set role            = 'agency_admin',
          organisation_id = excluded.organisation_id,
          is_active       = true;

    return new;
  end if;

  -- ------------------------------------------------ 3. allow-listed staff domain
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
      new.id,
      new.email,
      v_name,
      v_settings.staff_default_role,
      v_agency_org,
      -- Active immediately only where the agency has said an allow-listed
      -- domain is enough on its own.
      v_settings.staff_signup_mode = 'domain_allowlist'
    )
    on conflict (id) do nothing;

    return new;
  end if;

  -- ------------------------------------------------------------- 4. no access
  insert into public.users (id, email, full_name, role, organisation_id, is_active)
  values (new.id, new.email, v_name, 'client_member', null, false)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Staff awaiting activation, for the approval queue in Settings.
create index if not exists users_pending_activation_idx
  on public.users (created_at desc)
  where not is_active and deleted_at is null and organisation_id is not null;
