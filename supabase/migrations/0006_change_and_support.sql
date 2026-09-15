-- ===========================================================================
-- 0006  Change requests (with quote/approval round-trip) and support requests
-- ===========================================================================

create sequence public.change_request_reference_seq;
create sequence public.support_request_reference_seq;

-- --- change_requests ---------------------------------------------------------
create table public.change_requests (
  id                        uuid primary key default gen_random_uuid(),
  reference                 text not null unique
                              default 'CR-' || lpad(nextval('public.change_request_reference_seq')::text, 4, '0'),
  client_id                 uuid not null references public.clients (id) on delete cascade,
  project_id                uuid not null references public.projects (id) on delete cascade,
  subscription_id           uuid,  -- FK added in 0007
  title                     text not null check (length(trim(title)) between 1 and 300),
  category                  public.change_request_category not null default 'other',
  description               text not null check (length(trim(description)) > 0),
  affected_url              text,
  desired_outcome           text,
  priority                  public.task_priority not null default 'medium',
  status                    public.change_request_status not null default 'submitted',
  billing_treatment         public.billing_treatment,
  estimated_hours           numeric(6,2) check (estimated_hours is null or estimated_hours >= 0),
  estimated_cost            numeric(12,2) check (estimated_cost is null or estimated_cost >= 0),
  estimated_completion_date date,
  assigned_to               uuid references public.users (id) on delete set null,
  submitted_by              uuid references public.users (id) on delete set null,
  submitted_at              timestamptz not null default now(),
  -- Two distinct note fields: internal_notes is never sent to the client.
  internal_notes            text,
  client_notes              text,
  -- Effort actually spent, used to draw down the maintenance allowance.
  logged_minutes            integer not null default 0 check (logged_minutes >= 0),
  completed_at              timestamptz,
  rejected_reason           text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  deleted_at                timestamptz
);

create index change_requests_project_idx on public.change_requests (project_id, status)
  where deleted_at is null;
create index change_requests_client_idx on public.change_requests (client_id, status)
  where deleted_at is null;
create index change_requests_assigned_idx on public.change_requests (assigned_to)
  where deleted_at is null;
create index change_requests_open_idx on public.change_requests (submitted_at desc)
  where deleted_at is null
    and status not in ('completed', 'rejected', 'cancelled');

create trigger change_requests_set_updated_at
  before update on public.change_requests
  for each row execute function public.set_updated_at();

comment on column public.change_requests.internal_notes is
  'Agency-only. Excluded from every client-facing query and hidden by RLS column discipline.';

-- --- change_request_approvals ------------------------------------------------
-- One row per quote round, so the full approval history is preserved.
create table public.change_request_approvals (
  id                        uuid primary key default gen_random_uuid(),
  change_request_id         uuid not null references public.change_requests (id) on delete cascade,
  quoted_hours              numeric(6,2) check (quoted_hours is null or quoted_hours >= 0),
  quoted_cost               numeric(12,2) check (quoted_cost is null or quoted_cost >= 0),
  quote_notes               text,
  proposed_completion_date  date,
  billing_treatment         public.billing_treatment not null default 'requires_quotation',
  offered_by                uuid references public.users (id) on delete set null,
  offered_at                timestamptz not null default now(),
  decision                  public.quote_decision not null default 'pending',
  decided_by                uuid references public.users (id) on delete set null,
  decided_at                timestamptz,
  decision_notes            text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  -- Rejecting or asking for clarification requires an explanation.
  constraint cra_decision_notes_required check (
    decision in ('pending', 'approved')
    or (decision_notes is not null and length(trim(decision_notes)) > 0)
  )
);

create index cra_request_idx on public.change_request_approvals (change_request_id, offered_at desc);
create unique index cra_single_pending_idx
  on public.change_request_approvals (change_request_id)
  where decision = 'pending';

create trigger change_request_approvals_set_updated_at
  before update on public.change_request_approvals
  for each row execute function public.set_updated_at();

-- Deferred FK from 0005.
alter table public.files
  add constraint files_change_request_id_fkey
  foreign key (change_request_id) references public.change_requests (id) on delete cascade;

-- --- support_requests --------------------------------------------------------
create table public.support_requests (
  id                  uuid primary key default gen_random_uuid(),
  reference           text not null unique
                        default 'SR-' || lpad(nextval('public.support_request_reference_seq')::text, 4, '0'),
  client_id           uuid not null references public.clients (id) on delete cascade,
  project_id          uuid references public.projects (id) on delete set null,
  subscription_id     uuid,  -- FK added in 0007
  subject             text not null check (length(trim(subject)) between 1 and 300),
  category            public.support_category not null default 'general_support',
  description         text not null check (length(trim(description)) > 0),
  affected_url        text,
  urgency             public.urgency not null default 'normal',
  status              public.support_status not null default 'open',
  assigned_to         uuid references public.users (id) on delete set null,
  submitted_by        uuid references public.users (id) on delete set null,
  submitted_at        timestamptz not null default now(),
  -- Resolved at triage from the client's active subscription; shown in the portal.
  covered_by_plan     boolean,
  coverage_note       text,
  response_due_at     timestamptz,
  first_response_at   timestamptz,
  resolved_at         timestamptz,
  resolution_summary  text,
  time_spent_minutes  integer not null default 0 check (time_spent_minutes >= 0),
  internal_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index support_requests_client_idx on public.support_requests (client_id, status)
  where deleted_at is null;
create index support_requests_project_idx on public.support_requests (project_id)
  where deleted_at is null;
create index support_requests_open_idx on public.support_requests (urgency, submitted_at desc)
  where deleted_at is null and status not in ('resolved', 'closed');

create trigger support_requests_set_updated_at
  before update on public.support_requests
  for each row execute function public.set_updated_at();

-- Deferred FK from 0005.
alter table public.files
  add constraint files_support_request_id_fkey
  foreign key (support_request_id) references public.support_requests (id) on delete cascade;
