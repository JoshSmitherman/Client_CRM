-- ===========================================================================
-- 0007  Maintenance plans, subscriptions, usage, events, requests, reminders
-- ===========================================================================

-- --- maintenance_plans -------------------------------------------------------
-- Fully configurable. No tier is hard-coded anywhere in the application.
create table if not exists public.maintenance_plans (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  slug                      text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  description               text,
  monthly_price             numeric(12,2) check (monthly_price is null or monthly_price >= 0),
  annual_price              numeric(12,2) check (annual_price is null or annual_price >= 0),
  currency                  text not null default 'GBP' check (length(currency) = 3),
  included_services         text[] not null default '{}',
  included_change_minutes   integer not null default 0 check (included_change_minutes >= 0),
  included_support_minutes  integer not null default 0 check (included_support_minutes >= 0),
  response_time_hours       integer check (response_time_hours is null or response_time_hours > 0),
  priority_level            integer not null default 3 check (priority_level between 1 and 5),
  billing_frequency         public.billing_frequency not null default 'monthly',
  renewal_period_months     integer not null default 12 check (renewal_period_months > 0),
  is_active                 boolean not null default true,
  -- is_public controls whether clients can see the tier in the portal.
  is_public                 boolean not null default true,
  position                  integer not null default 0,
  created_by                uuid references public.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists maintenance_plans_active_idx
  on public.maintenance_plans (position)
  where is_active;

drop trigger if exists maintenance_plans_set_updated_at on public.maintenance_plans;
create trigger maintenance_plans_set_updated_at
  before update on public.maintenance_plans
  for each row execute function public.set_updated_at();

-- --- maintenance_subscriptions ----------------------------------------------
create table if not exists public.maintenance_subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid not null references public.clients (id) on delete cascade,
  project_id                uuid references public.projects (id) on delete set null,
  -- RESTRICT: a plan with history must be deactivated, never deleted.
  plan_id                   uuid not null references public.maintenance_plans (id) on delete restrict,
  status                    public.subscription_status not null default 'active',
  website_url               text,
  start_date                date not null default current_date,
  renewal_date              date not null,
  end_date                  date,
  billing_cycle             public.billing_frequency not null default 'monthly',
  price                     numeric(12,2) not null default 0 check (price >= 0),
  currency                  text not null default 'GBP' check (length(currency) = 3),
  -- Allowances are snapshotted so editing a plan never rewrites past periods.
  included_change_minutes   integer not null default 0 check (included_change_minutes >= 0),
  included_support_minutes  integer not null default 0 check (included_support_minutes >= 0),
  auto_renew                boolean not null default true,
  created_by                uuid references public.users (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz,
  constraint subscriptions_renewal_after_start check (renewal_date >= start_date)
);

create index if not exists subscriptions_client_idx
  on public.maintenance_subscriptions (client_id)
  where deleted_at is null;
create index if not exists subscriptions_project_idx
  on public.maintenance_subscriptions (project_id)
  where deleted_at is null;
create index if not exists subscriptions_renewal_idx
  on public.maintenance_subscriptions (renewal_date)
  where deleted_at is null and status in ('trial', 'active', 'renewal_due');

drop trigger if exists maintenance_subscriptions_set_updated_at on public.maintenance_subscriptions;
create trigger maintenance_subscriptions_set_updated_at
  before update on public.maintenance_subscriptions
  for each row execute function public.set_updated_at();

-- Deferred FKs from 0006.
do $$ begin
  alter table public.change_requests
    add constraint change_requests_subscription_id_fkey
    foreign key (subscription_id) references public.maintenance_subscriptions (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.support_requests
    add constraint support_requests_subscription_id_fkey
    foreign key (subscription_id) references public.maintenance_subscriptions (id) on delete set null;
exception when duplicate_object then null; end $$;

-- --- maintenance_usage -------------------------------------------------------
-- Minutes, not decimal hours, so "1 hour 20 minutes" is exact.
create table if not exists public.maintenance_usage (
  id                    uuid primary key default gen_random_uuid(),
  subscription_id       uuid not null references public.maintenance_subscriptions (id) on delete cascade,
  client_id             uuid not null references public.clients (id) on delete cascade,
  period_start          date not null,
  period_end            date not null,
  usage_type            public.usage_type not null,
  minutes               integer not null,
  description           text not null,
  change_request_id     uuid references public.change_requests (id) on delete set null,
  support_request_id    uuid references public.support_requests (id) on delete set null,
  -- Agency users may correct recorded usage; corrections are always attributed.
  is_manual_adjustment  boolean not null default false,
  occurred_on           date not null default current_date,
  recorded_by           uuid references public.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  constraint usage_period_valid check (period_end >= period_start)
);

create index if not exists usage_subscription_period_idx
  on public.maintenance_usage (subscription_id, period_start desc);
create index if not exists usage_change_request_idx
  on public.maintenance_usage (change_request_id);
create index if not exists usage_support_request_idx
  on public.maintenance_usage (support_request_id);

comment on column public.maintenance_usage.minutes is
  'May be negative when correcting a previous over-recording (is_manual_adjustment = true).';

-- --- maintenance_events ------------------------------------------------------
-- Immutable subscription history.
create table if not exists public.maintenance_events (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.maintenance_subscriptions (id) on delete cascade,
  event_type       public.maintenance_event_type not null,
  from_plan_id     uuid references public.maintenance_plans (id) on delete set null,
  to_plan_id       uuid references public.maintenance_plans (id) on delete set null,
  effective_date   date not null default current_date,
  notes            text,
  actor_id         uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index if not exists maintenance_events_subscription_idx
  on public.maintenance_events (subscription_id, created_at desc);

-- --- maintenance_plan_requests -----------------------------------------------
-- Clients request; the agency decides. A subscription is never changed directly.
create table if not exists public.maintenance_plan_requests (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.clients (id) on delete cascade,
  subscription_id   uuid references public.maintenance_subscriptions (id) on delete cascade,
  requested_type    public.plan_request_type not null,
  requested_plan_id uuid references public.maintenance_plans (id) on delete set null,
  message           text,
  status            public.plan_request_status not null default 'pending',
  requested_by      uuid references public.users (id) on delete set null,
  reviewed_by       uuid references public.users (id) on delete set null,
  reviewed_at       timestamptz,
  response_notes    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists plan_requests_client_idx
  on public.maintenance_plan_requests (client_id, status);
create index if not exists plan_requests_pending_idx
  on public.maintenance_plan_requests (created_at desc)
  where status = 'pending';

drop trigger if exists maintenance_plan_requests_set_updated_at on public.maintenance_plan_requests;
create trigger maintenance_plan_requests_set_updated_at
  before update on public.maintenance_plan_requests
  for each row execute function public.set_updated_at();

-- --- renewal_reminders -------------------------------------------------------
create table if not exists public.renewal_reminders (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  subscription_id  uuid references public.maintenance_subscriptions (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete cascade,
  reminder_type    public.reminder_type not null,
  title            text not null,
  due_date         date not null,
  -- Days before due_date at which this reminder should surface.
  offsets          integer[] not null default '{60,30,14,7,0}',
  status           public.reminder_status not null default 'scheduled',
  assigned_to      uuid references public.users (id) on delete set null,
  notes            text,
  last_notified_at timestamptz,
  -- Highest offset already notified, so the sweep is idempotent.
  last_offset_sent integer,
  completed_at     timestamptz,
  created_by       uuid references public.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists reminders_due_idx
  on public.renewal_reminders (due_date)
  where status in ('scheduled', 'due');
create index if not exists reminders_client_idx
  on public.renewal_reminders (client_id);
create index if not exists reminders_subscription_idx
  on public.renewal_reminders (subscription_id);

drop trigger if exists renewal_reminders_set_updated_at on public.renewal_reminders;
create trigger renewal_reminders_set_updated_at
  before update on public.renewal_reminders
  for each row execute function public.set_updated_at();
