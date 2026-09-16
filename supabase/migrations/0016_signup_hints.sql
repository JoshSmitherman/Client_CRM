-- Public hints for the staff signup screen.
--
-- The signup form is reached by someone who is not signed in, so it cannot read
-- agency_settings: that table is readable by authenticated users only, and it
-- holds settings that are nobody else's business.
--
-- Without this the screen has to guess, and it guessed wrongly — telling every
-- visitor that no domains were approved. This function discloses exactly the
-- three facts the screen needs to give accurate instructions, and nothing else:
-- whether self-registration is open, which email domains are accepted, and
-- whether this is a brand-new installation whose first account becomes the
-- administrator.
--
-- None of that is sensitive. The domains are the agency's own public email
-- domains, and knowing the mode does not grant an account — handle_new_user()
-- still decides what a new signup is allowed to be, and an address on an
-- approved domain still has to be a real mailbox the person can receive at.

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
      select 1
      from public.users u
      where u.role = 'agency_admin'
        and u.is_active
        and u.deleted_at is null
    )
  from (select 1) one
  left join public.agency_settings s on true
  limit 1;
$$;

comment on function public.staff_signup_hints() is
  'Non-sensitive signup guidance for the public signup screen: mode, approved '
  'email domains, and whether this installation has an administrator yet.';

revoke all on function public.staff_signup_hints() from public;
grant execute on function public.staff_signup_hints() to anon, authenticated;
