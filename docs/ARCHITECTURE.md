# Client CRM — System Architecture

> Agency client portal & project management platform.
> Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Vercel-ready.

This document is the design contract for the application. It is written **before** implementation
and is the reference that the code follows. Sections map 1:1 to the twelve design deliverables.

---

## 1. Proposed System Architecture

### 1.1 High-level shape

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser (React 19 · Tailwind · responsive: mobile → desktop)          │
│  ── Agency workspace (/dashboard, /clients, /projects/…)               │
│  ── Client portal    (/portal/…)                                       │
└───────────────┬───────────────────────────────────────────────────────┘
                │  RSC payloads · Server Action POSTs · signed file URLs
┌───────────────▼───────────────────────────────────────────────────────┐
│  Next.js App Router (Vercel / Node runtime)                            │
│                                                                        │
│  middleware.ts        session refresh + coarse route guard             │
│  app/(agency)         React Server Components, agency-only             │
│  app/(portal)         React Server Components, client-only             │
│  app/(auth)           login / invite acceptance / password reset       │
│  app/api/*            only where a route handler is genuinely needed   │
│                       (file download proxy, cron-style reminder sweep) │
│                                                                        │
│  lib/auth             requireUser / requireAgency / requireClient      │
│  lib/permissions      the single source of truth for "can X do Y"      │
│  lib/actions/*        Server Actions — validate → authorise → mutate   │
│                       → audit → activity → notify → revalidate         │
│  lib/queries/*        typed read helpers used by Server Components     │
└───────────────┬───────────────────────────────────────────────────────┘
                │  postgrest (anon key + user JWT)  │  service role (server only)
┌───────────────▼───────────────────────────────────▼───────────────────┐
│  Supabase                                                              │
│   Postgres  — 40+ tables, enums, triggers, RLS on every table          │
│   Auth      — email/password + invite links, JWT carries user id       │
│   Storage   — private buckets, RLS-mirrored path policies              │
└───────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key architectural decisions

| # | Decision | Rationale |
|---|----------|-----------|
| A1 | **App Router + React Server Components** | Data is fetched on the server with the user's own JWT, so RLS applies to every read. No client-side data fetching layer to secure separately. |
| A2 | **Server Actions for every mutation** | One choke point per mutation where we validate (zod) → authorise → write → audit → log activity → notify → `revalidatePath`. No REST surface to forget to protect. |
| A3 | **RLS is the security boundary, not the UI** | Every table has RLS enabled and `FORCE`d. The UI hides what you can't do; the database *refuses* it. A compromised or bypassed frontend cannot read another tenant's data. |
| A4 | **Two Supabase clients, never mixed** | `createServerClient()` (anon key + user cookie session) is used for all normal work. `createAdminClient()` (service role) lives in `lib/supabase/admin.ts`, is marked `import 'server-only'`, and is used *only* for user invitation and the reminder sweep. |
| A5 | **Permissions expressed twice, deliberately** | SQL functions (`can_access_project`, `is_agency`, …) drive RLS; a mirrored TypeScript module drives the UI. They are kept in lockstep and documented side by side, because the DB cannot render a button and the UI cannot be trusted. |
| A6 | **Polymorphic comments / activity / approvals** | `entity_type` + `entity_id` + a denormalised `project_id`. The denormalised `project_id` exists *specifically* so RLS can be a cheap index lookup instead of a recursive join. |
| A7 | **jsonb for onboarding answers, relational for everything else** | Onboarding questionnaires must be agency-configurable. Their answers live in `onboarding_sections.responses jsonb`, validated server-side by a zod schema selected by section key. Everything with a lifecycle (tasks, requests, subscriptions) is fully relational. |
| A8 | **No UI component library** | Tailwind + a small hand-built primitive set (`components/ui`). Avoids a heavy dependency, keeps bundle small, and guarantees the "premium SaaS" look is ours rather than a default theme. |
| A9 | **Soft deletion where history matters** | `deleted_at` on clients, projects, files, tasks, requests, comments. Audit and activity rows are never deleted. |
| A10 | **Money as `numeric(12,2)`, durations as integer minutes** | No floats for currency. Allowances are minutes so "1 hour 20 minutes" is exact. |

### 1.3 Directory structure

```
src/
  app/
    (auth)/login | invite | reset-password | auth/callback
    (agency)/    dashboard, clients, projects, change-requests, support,
                 maintenance, tasks, files, notifications, settings
    (portal)/    portal/{home, projects, requests, support, files,
                 maintenance, messages}
    api/files/[id]/route.ts        signed-download proxy
    api/reminders/sweep/route.ts   idempotent reminder materialiser
  components/
    ui/          Button, Card, Badge, Input, Select, Textarea, Modal, Tabs,
                 Table, Progress, Timeline, EmptyState, Avatar, Toast, …
    layout/      AppShell, Sidebar, MobileNav, Topbar, PageHeader
    <domain>/    clients/, projects/, onboarding/, tasks/, files/,
                 change-requests/, support/, maintenance/, handover/,
                 comments/, activity/
  lib/
    supabase/    server.ts, client.ts, admin.ts, database.types.ts
    auth.ts      session + profile resolution, route guards
    permissions.ts
    actions/     one module per domain
    queries/     one module per domain
    validation/  zod schemas (shared by forms and Server Actions)
    audit.ts activity.ts notifications.ts
    constants.ts format.ts utils.ts
  config/brand.ts    single-file branding (name, tagline, colours, logo)
supabase/
  migrations/  0001_extensions_and_enums … 0010_storage
  seed.sql     realistic demo data
docs/
```

---

## 2. Database Schema

UUID primary keys (`gen_random_uuid()`), `created_at`/`updated_at` on every mutable table
(`updated_at` maintained by a shared trigger), `created_by` where authorship matters,
`deleted_at` for soft deletion.

### 2.1 Enumerated types

| Enum | Values |
|------|--------|
| `app_role` | `agency_admin`, `project_manager`, `account_manager`, `developer`, `designer`, `qa`, `support_agent`, `client_owner`, `client_member` |
| `organisation_kind` | `agency`, `client` |
| `project_type` | `new_website`, `website_redesign`, `ecommerce`, `landing_page`, `website_maintenance`, `branding`, `social_media_rebrand`, `seo`, `it_consultancy`, `custom_development` |
| `project_health` | `on_track`, `at_risk`, `off_track`, `on_hold` |
| `onboarding_status` | `not_started`, `in_progress`, `submitted`, `needs_changes`, `approved`, `not_required` |
| `task_status` | `to_do`, `in_progress`, `waiting`, `complete` |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `responsibility` | `agency`, `client` |
| `file_category` | `image`, `logo`, `video`, `document`, `spreadsheet`, `pdf`, `brand_asset`, `contract`, `other` |
| `file_approval_status` | `pending`, `approved`, `rejected`, `needs_replacement` |
| `page_status` | `draft`, `submitted`, `needs_changes`, `approved` |
| `page_kind` | `standard`, `landing`, `footer`, `hidden` |
| `change_request_category` | `content_change`, `image_change`, `new_page`, `existing_page_update`, `design_change`, `bug`, `new_feature`, `integration_change`, `seo_change`, `technical_request`, `other` |
| `change_request_status` | `submitted`, `awaiting_review`, `more_information_required`, `quotation_required`, `awaiting_client_approval`, `approved`, `scheduled`, `in_progress`, `internal_qa`, `client_review`, `completed`, `rejected`, `cancelled` |
| `billing_treatment` | `included_in_plan`, `additional_charge`, `requires_quotation`, `out_of_scope` |
| `quote_decision` | `pending`, `approved`, `rejected`, `clarification_requested` |
| `support_category` | `website_down`, `broken_functionality`, `email_issue`, `domain_issue`, `hosting_issue`, `security_concern`, `performance_problem`, `general_support`, `other` |
| `support_status` | `open`, `triaged`, `awaiting_client`, `in_progress`, `resolved`, `closed` |
| `urgency` | `low`, `normal`, `high`, `critical` |
| `subscription_status` | `trial`, `active`, `renewal_due`, `suspended`, `cancelled`, `expired` |
| `billing_frequency` | `monthly`, `quarterly`, `annual` |
| `plan_request_type` | `upgrade`, `downgrade`, `cancellation`, `renewal_discussion` |
| `reminder_type` | `subscription_renewal`, `payment_due`, `maintenance_review`, `domain_renewal`, `hosting_renewal`, `ssl_expiry`, `licence_renewal`, `backup_check`, `security_review`, `monthly_report` |
| `reminder_status` | `scheduled`, `due`, `acknowledged`, `completed`, `dismissed` |
| `handover_status` | `draft`, `ready`, `delivered`, `accepted` |
| `handover_item_status` | `pending`, `in_progress`, `complete`, `not_applicable` |
| `approval_decision` | `approved`, `rejected`, `changes_requested` |
| `comment_entity` | `project`, `task`, `file`, `website_page`, `change_request`, `support_request`, `onboarding_section`, `handover_item`, `milestone` |
| `activity_visibility` | `internal`, `client` |
| `notification_type` | 14 values covering submissions, approvals, comments, overdue tasks, renewals, allowance warnings, … |
| `integration_status` | `not_required`, `requested`, `pending`, `configured` |

### 2.2 Tables by domain

**Identity & tenancy**

| Table | Purpose | Notable columns |
|-------|---------|-----------------|
| `organisations` | Tenancy root. One row `kind='agency'`, one per client company. | `kind`, `name`, `slug` |
| `users` | Profile mirror of `auth.users`, created by trigger on signup. | `id` (=auth uid), `role app_role`, `organisation_id`, `job_title`, `is_active`, `last_seen_at` |
| `invitations` | Invite-only account provisioning. | `email`, `role`, `organisation_id`, `client_id`, `token`, `expires_at`, `accepted_at`, `revoked_at` |
| `agency_settings` | Singleton row: brand, defaults, feature switches. | `allow_client_plan_selection`, `default_reminder_offsets int[]` |

**CRM**

| Table | Notable columns |
|-------|-----------------|
| `clients` | `organisation_id` (unique), `company_name`, `trading_name`, `registration_number`, `primary_contact_name`, `email`, `phone`, `website`, `address_line1/2`, `city`, `region`, `postcode`, `country`, `industry`, `description`, `is_existing_client`, `account_manager_id`, `internal_notes`, `status`, `created_by`, timestamps, `deleted_at` |

**Projects & planning**

| Table | Notable columns |
|-------|-----------------|
| `lifecycle_stages` | Agency-editable. `key`, `label`, `position`, `colour`, `is_active`, `is_terminal`, `counts_toward_progress` |
| `projects` | `client_id`, `name`, `reference`, `project_type`, `description`, `stage_id`, `health`, `target_start_date`, `target_launch_date`, `actual_launch_date`, `completion_percentage`, `internal_notes`, `archived_at`, `deleted_at` |
| `project_members` | `project_id`, `user_id`, `project_role`, `can_edit`. Unique pair. |
| `project_plans` | 1:1. `scope`, `objectives`, `client_responsibilities`, `agency_responsibilities`, `notes` |
| `project_deliverables` | `title`, `description`, `owner_side responsibility`, `due_date`, `is_complete`, `position` |
| `project_risks` | `title`, `description`, `likelihood`, `impact`, `mitigation`, `status`, `owner_id` |
| `project_milestones` | `title`, `target_date`, `completed_at`, `position`, `depends_on_id` (self-FK → dependencies) |

**Onboarding & content**

| Table | Notable columns |
|-------|-----------------|
| `onboarding_templates` / `onboarding_template_sections` | Reusable, per project type. |
| `onboarding_sections` | `project_id`, `key`, `title`, `position`, `status onboarding_status`, `responses jsonb`, `agency_feedback`, `submitted_at/by`, `reviewed_at/by` |
| `onboarding_items` | Per-requirement tracking inside a section (e.g. "Primary logo (SVG)") with own `status`, `notes`, optional `file_id`. |
| `website_pages` | Sitemap **and** content. `parent_id` (self-FK), `position`, `page_kind`, `in_navigation`, `status page_status`, `purpose`, `main_heading`, `body_copy`, `calls_to_action jsonb`, `seo_title`, `meta_description`, `notes` |
| `integrations` | `project_id`, `provider`, `label`, `status integration_status`, `account_reference`, `notes` |

**Files**

| Table | Notable columns |
|-------|-----------------|
| `files` | `project_id`, `client_id`, `website_page_id`, `onboarding_section_id`, `bucket`, `storage_path`, `file_name`, `original_name`, `mime_type`, `size_bytes`, `checksum`, `category`, `description`, `approval_status`, `uploaded_by`, `deleted_at` |

**Work**

| Table | Notable columns |
|-------|-----------------|
| `tasks` | `project_id`, `title`, `description`, `assignee_id`, `responsibility`, `due_date`, `priority`, `status`, `onboarding_section_id`, `milestone_id`, `completed_at`, `position` |
| `comments` | `entity_type comment_entity`, `entity_id`, `project_id` (denormalised for RLS), `parent_id`, `author_id`, `body`, `is_internal`, `edited_at`, `deleted_at` |
| `approvals` | `project_id`, `entity_type`, `entity_id`, `decision approval_decision`, `reason`, `previous_status`, `new_status`, `decided_by` |

**Change requests**

| Table | Notable columns |
|-------|-----------------|
| `change_requests` | `reference` (`CR-0001`, generated), `project_id`, `client_id`, `subscription_id`, `title`, `category`, `description`, `affected_url`, `desired_outcome`, `priority`, `status`, `billing_treatment`, `estimated_hours`, `estimated_cost`, `estimated_completion_date`, `assigned_to`, `submitted_by`, `internal_notes`, `client_notes`, `completed_at` |
| `change_request_approvals` | The quote/approval round-trip: `quoted_hours`, `quoted_cost`, `quote_notes`, `proposed_completion_date`, `offered_by/at`, `decision quote_decision`, `decided_by/at`, `decision_notes`. Multiple rows = full approval history. |

**Support**

| Table | Notable columns |
|-------|-----------------|
| `support_requests` | `reference` (`SR-0001`), `client_id`, `project_id`, `subscription_id`, `category`, `subject`, `description`, `urgency`, `status`, `assigned_to`, `covered_by_plan`, `time_spent_minutes`, `first_response_at`, `resolved_at`, `internal_notes` |

**Maintenance**

| Table | Notable columns |
|-------|-----------------|
| `maintenance_plans` | `name`, `description`, `monthly_price`, `annual_price`, `currency`, `included_services text[]`, `included_change_minutes`, `included_support_minutes`, `response_time_hours`, `priority_level`, `billing_frequency`, `renewal_period_months`, `is_active`, `is_public`, `position` |
| `maintenance_subscriptions` | `client_id`, `project_id`, `plan_id`, `status`, `start_date`, `renewal_date`, `end_date`, `billing_cycle`, `price`, `included_*_minutes` (snapshot so plan edits don't rewrite history), `auto_renew`, `internal_notes` |
| `maintenance_usage` | `subscription_id`, `period_start/end`, `usage_type`, `minutes`, `description`, `change_request_id`, `support_request_id`, `is_manual_adjustment`, `recorded_by`, `occurred_on` |
| `maintenance_events` | Immutable subscription history: `event_type`, `from_plan_id`, `to_plan_id`, `notes`, `actor_id` |
| `maintenance_plan_requests` | Client-initiated `upgrade`/`downgrade`/`cancellation`/`renewal_discussion`, with agency review fields. Never mutates the subscription directly. |
| `renewal_reminders` | `reminder_type`, `title`, `due_date`, `offsets int[]`, `status`, `assigned_to`, `last_notified_at`, `notes` |

**Handover**

| Table | Notable columns |
|-------|-----------------|
| `handovers` | 1:1 project. `website_url`, `admin_url`, `cms_platform`, `hosting_provider`, `domain_registrar`, `dns_provider`, `analytics_notes`, `search_console_notes`, `backup_notes`, `security_notes`, `third_party_services jsonb`, `licence_notes`, `documentation_notes`, `training_notes`, `maintenance_notes`, `status handover_status`, `delivered_at` |
| `handover_checklists` / `handover_items` | Customisable checklists; items carry `status`, `completed_by/at`, `notes`. |
| `handover_documents` | `file_id`, `title`, `doc_type`, `description`, `visible_to_client`. Remains available after project completion. |
| `client_acceptances` | `project_id`, `approved_by`, `accepted_at`, `statement`, `project_version`, six boolean confirmations, `signature_name`, `ip_address`, `user_agent`. Append-only. |

**System**

| Table | Notable columns |
|-------|-----------------|
| `notifications` | `user_id`, `type`, `title`, `body`, `url`, `entity_type/id`, `project_id`, `is_read`, `read_at` |
| `activity_logs` | `project_id`, `client_id`, `actor_id`, `action`, `entity_type/id`, `summary`, `metadata jsonb`, `visibility` |
| `audit_logs` | `actor_id`, `action`, `entity_type/id`, `previous_value jsonb`, `new_value jsonb`, `ip_address`, `user_agent`. Insert-only; no update/delete policy exists for anyone. |

### 2.3 Indexing strategy

- Every foreign key used in a filter gets an index (`projects(client_id)`, `tasks(project_id, status)`,
  `change_requests(project_id, status)`, `comments(entity_type, entity_id)`, `files(project_id)`).
- Partial indexes for the hot dashboard queries:
  `tasks(due_date) WHERE status <> 'complete' AND deleted_at IS NULL`,
  `maintenance_subscriptions(renewal_date) WHERE status IN ('active','renewal_due')`,
  `notifications(user_id) WHERE is_read = false`.
- `activity_logs(project_id, created_at DESC)` and `audit_logs(entity_type, entity_id, created_at DESC)`
  for timeline reads.
- Unique constraints: `project_members(project_id,user_id)`, `clients(organisation_id)`,
  `onboarding_sections(project_id,key)`, `handovers(project_id)`, `projects(reference)`.

---

## 3. Database Relationships

```
organisations ─1:1─ clients ─1:N─ projects ─1:N─ project_members ─N:1─ users
     │                  │              ├─1:1─ project_plans
     └─1:N─ users       │              ├─1:N─ project_deliverables
                        │              ├─1:N─ project_risks
                        │              ├─1:N─ project_milestones ──self-FK─ dependencies
                        │              ├─1:N─ onboarding_sections ─1:N─ onboarding_items
                        │              ├─1:N─ website_pages ──self-FK─ sitemap tree
                        │              ├─1:N─ integrations
                        │              ├─1:N─ tasks
                        │              ├─1:N─ files
                        │              ├─1:N─ change_requests ─1:N─ change_request_approvals
                        │              ├─1:N─ support_requests
                        │              ├─1:1─ handovers ─1:N─ handover_checklists ─1:N─ handover_items
                        │              │                 └─1:N─ handover_documents ─N:1─ files
                        │              ├─1:N─ client_acceptances
                        │              ├─1:N─ approvals
                        │              ├─1:N─ comments      (polymorphic within project)
                        │              └─1:N─ activity_logs
                        │
                        ├─1:N─ maintenance_subscriptions ─N:1─ maintenance_plans
                        │            ├─1:N─ maintenance_usage
                        │            ├─1:N─ maintenance_events
                        │            ├─1:N─ maintenance_plan_requests
                        │            └─1:N─ renewal_reminders
                        └─1:N─ support_requests (client-level, project optional)
```

**Cascade rules**

- `ON DELETE CASCADE` for rows that cannot exist alone: project children, section items,
  checklist items, usage rows.
- `ON DELETE RESTRICT` for `maintenance_plans` referenced by a subscription — you must
  deactivate a plan, never delete one that has history.
- `ON DELETE SET NULL` for optional actor references (`assigned_to`, `account_manager_id`)
  so removing a staff member never destroys a request.
- `audit_logs` and `activity_logs` keep `actor_id` with `ON DELETE SET NULL` and retain the
  actor's name in `metadata`, so history survives account removal.

---

## 4. Page and Route Structure

### 4.1 Public / auth

| Route | Purpose |
|-------|---------|
| `/` | Redirects by role: agency → `/dashboard`, client → `/portal`, anonymous → `/login` |
| `/login` | Email + password |
| `/invite/[token]` | Accept invitation, set password, activate profile |
| `/reset-password`, `/update-password` | Password recovery |
| `/auth/callback` | Supabase code exchange |
| `/setup` | Shown when env vars are missing — links to `docs/SETUP.md` instead of a stack trace |

### 4.2 Agency workspace

| Route | Contents |
|-------|----------|
| `/dashboard` | 13 KPI tiles, filters (client, project, staff, status, type, tier, completion), search, attention lists, recently updated |
| `/clients` · `/clients/new` · `/clients/[id]` · `/clients/[id]/edit` | CRM list, record with tabs: Overview, Projects, Subscriptions, Requests, Files, People, Notes |
| `/projects` · `/projects/new` | Filterable project index (table + board) |
| `/projects/[id]` | Workspace shell with tabs below |
| `…/[id]` Overview · Planning · Onboarding · Tasks · Content · Files · Changes · Support · Handover · Maintenance · Comments · Activity · Settings | 13 tabs as specified |
| `/change-requests` · `/change-requests/[id]` | Triage queue, detail with quote/approval panel and timeline |
| `/support` · `/support/[id]` | Ticket queue by urgency and cover status |
| `/maintenance` | Tabs: Plans, Subscriptions, Usage, Reminders, Plan requests |
| `/maintenance/plans/[id]`, `/maintenance/subscriptions/[id]` | Plan editor, subscription detail with allowance meters |
| `/tasks` | Cross-project task list, overdue flagged |
| `/files` | Cross-project media library |
| `/notifications` | Inbox |
| `/settings` | Tabs: Agency, Branding, Team & invitations, Lifecycle stages, Onboarding templates, Handover templates, Reminder defaults, Audit log |

### 4.3 Client portal

| Route | Contents |
|-------|----------|
| `/portal` | Welcome, active projects, progress, outstanding actions, requests, deadlines, subscription, renewal, recent messages/files/activity, 6 prominent CTAs |
| `/portal/projects` · `/portal/projects/[id]` | Progress, stage, milestones, actions, files, comments |
| `/portal/projects/[id]/onboarding` · `…/onboarding/[section]` | Wizard with save-draft / submit |
| `/portal/projects/[id]/content` · `…/content/[pageId]` | Page-by-page content submission |
| `/portal/projects/[id]/handover` | Handover pack + formal acceptance form |
| `/portal/requests` · `/portal/requests/new` · `/portal/requests/[id]` | Change requests incl. quote approval |
| `/portal/support` · `/portal/support/new` · `/portal/support/[id]` | Support tickets with cover indicator |
| `/portal/files` | Their files, upload, approval status |
| `/portal/maintenance` | Plan, allowance, history, upgrade/downgrade/cancel requests |
| `/portal/messages` | Comment threads visible to the client (internal notes never appear) |
| `/portal/account` | Profile & password |

---

## 5. Authentication Design

**Provider:** Supabase Auth (email + password). Sessions in httpOnly cookies via `@supabase/ssr`.

**Provisioning is invite-only.** There is no public signup route.

```
Agency admin fills invite form
      │  Server Action: requireAgencyAdmin() → validate → insert `invitations`
      ▼
createAdminClient().auth.admin.inviteUserByEmail(email, { redirectTo: /invite/<token> })
      │  service-role key used server-side only, never serialised to the client
      ▼
Invitee clicks link → /invite/[token] → sets password
      │
      ▼
Trigger `handle_new_user()` on auth.users INSERT
      ├─ finds the pending, unexpired invitation by email
      ├─ inserts public.users { id, email, full_name, role, organisation_id }
      ├─ links the client contact, stamps invitations.accepted_at
      └─ if no invitation exists → profile is created inactive with no org (cannot see anything)
```

**Session handling**

- `middleware.ts` refreshes the Supabase session on every request and performs a *coarse*
  guard (authenticated? agency route vs portal route?). It is a convenience, not the boundary.
- Every page and Server Action calls `requireUser()` / `requireAgency()` / `requireClient()`
  which re-resolve the profile server-side.
- The real boundary is RLS. Even a forged request reaching Postgres returns zero rows.

**Secrets**

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for the browser by design.
- `SUPABASE_SERVICE_ROLE_KEY` — read only inside `lib/supabase/admin.ts`, which begins with
  `import 'server-only'` so a client-component import is a build error.

---

## 6. Permission Model

### 6.1 Roles

| Role | Scope |
|------|-------|
| `agency_admin` | Everything, including settings, plans, team, audit log |
| `project_manager` | All clients and projects; no agency settings or billing config |
| `account_manager` | Clients they manage + those clients' projects |
| `developer` / `designer` / `qa` / `support_agent` | Only projects they are a member of |
| `client_owner` | Their own organisation: all its projects, requests, files, subscriptions; can invite colleagues |
| `client_member` | Their own organisation, read + submit; cannot invite or accept handover |

The MVP ships `agency_admin` and the two client roles as fully exercised paths; the other
agency roles already resolve correctly through the same functions, so adding them later is
a data change, not a code change.

### 6.2 SQL predicates (the enforcement layer)

All are `SECURITY DEFINER`, `STABLE`, and set `search_path = public` so they read profiles
without recursing into the RLS they power.

```sql
current_profile()        → users row for auth.uid()
current_app_role()       → app_role
is_agency()              → role NOT IN ('client_owner','client_member')
is_agency_admin()        → role = 'agency_admin'
is_client()              → role IN ('client_owner','client_member')
current_client_id()      → the clients.id for the caller's organisation (NULL for agency)
can_access_client(uuid)  → is_agency_admin() OR project_manager
                           OR account_manager owns it
                           OR agency member of one of its projects
                           OR client belongs to it
can_access_project(uuid) → is_agency_admin() OR project_manager
                           OR project_members row
                           OR account_manager of the project's client
                           OR client owns the project
can_edit_project(uuid)   → agency + can_access_project + (admin/PM or member.can_edit)
```

### 6.3 Policy shape

| Table group | SELECT | INSERT / UPDATE | DELETE |
|-------------|--------|-----------------|--------|
| Project-scoped (tasks, files, pages, milestones, …) | `can_access_project(project_id)` | `can_edit_project(project_id)`; clients restricted to their own submissions in defined states | agency admin / PM only, and mostly soft-delete |
| `comments` | `can_access_project(project_id) AND (is_agency() OR NOT is_internal)` | author only for update | author or admin |
| `change_requests` | `can_access_project` | client may INSERT for own project and UPDATE only while `status='submitted'`; agency may update all fields | agency admin |
| `maintenance_plans` | `is_agency() OR (is_public AND is_active)` | agency admin | agency admin |
| `maintenance_subscriptions` | `is_agency() OR can_access_client(client_id)` | agency only — clients go through `maintenance_plan_requests` | agency admin |
| `audit_logs` | `is_agency_admin()` | via `SECURITY DEFINER` helper only | **no policy — nobody** |
| `users` | self, agency, or same organisation | self (safe columns) / agency admin | none |

`is_internal` on comments is the single hard line for client visibility and is enforced in the
SELECT policy itself, not by a filter in application code.

### 6.4 Storage

Private bucket `project-files`, object paths `projects/<project_id>/<uuid>-<filename>`.
Storage policies call `can_access_project((storage.foldername(name))[2]::uuid)`, so the same
predicate governs rows and bytes. Downloads are served through `/api/files/[id]`, which
re-checks access and returns a short-lived signed URL — object paths are never public.

---

## 7. Project Lifecycle

Stages live in `lifecycle_stages` (seeded, reorderable, renameable, deactivatable) rather than
in an enum, because the spec requires later customisation.

```
1 Lead Converted → 2 Onboarding → 3 Planning → 4 Awaiting Content → 5 Design
→ 6 Development → 7 Internal QA → 8 Client Review ⇄ 9 Changes Requested
→ 10 Final Approval → 11 Launch Preparation → 12 Live → 13 Handover
→ 14 Maintenance → 15 Archived
```

- Stage 8 ⇄ 9 is the only loop; everything else advances forward.
- Moving a project to `Handover` requires the handover record to exist and be `ready`.
- Moving to `Maintenance` prompts to create or confirm a subscription.
- Stage changes write an `activity_log` and an `audit_log` row.

**Progress model.** `completion_percentage` is computed, not typed by hand:

```
Onboarding  = approved+not-required sections ÷ sections excluding "not required"
Planning    = complete milestones up to "Design approved" ÷ that set
Content     = approved pages ÷ pages
Development = complete dev/design tasks ÷ those tasks
QA          = complete QA tasks ÷ QA tasks
Handover    = complete checklist items ÷ applicable items

Overall = Σ(component × weight) using stage-appropriate weights
```

---

## 8. Change Request Workflow

```
        ┌──────────────────────────────────────────────────────────────┐
CLIENT  │ Submit Change Request (title, type, description, URL,        │
        │ desired result, priority, screenshots/attachments)           │
        └───────────────┬──────────────────────────────────────────────┘
                        ▼  status = submitted
AGENCY  triage → awaiting_review
          ├─ needs detail ─────────→ more_information_required ─┐
          │                                                     │ client responds
          │◄────────────────────────────────────────────────────┘
          ├─ covered by plan ──────→ billing_treatment=included_in_plan → approved
          └─ chargeable ───────────→ quotation_required
                                       │ agency records hours, cost, notes,
                                       │ proposed completion date
                                       ▼  change_request_approvals row created
                                     awaiting_client_approval
                                       ├─ client approves  → approved
                                       ├─ client rejects   → rejected
                                       └─ client asks      → more_information_required
                                          clarification
approved → scheduled → in_progress → internal_qa → client_review → completed
                                                      └─ client rejects → in_progress
any state → cancelled (client, before work starts) | rejected (agency, reason required)
```

- Every transition appends to `activity_logs` — this *is* the per-request timeline, stored permanently.
- Each quote round is its own `change_request_approvals` row, so the full history is preserved.
- On `completed`, if the request is `included_in_plan` and the project has an active subscription,
  logged effort is written to `maintenance_usage` against the current period.
- Clients can edit their own request only while `status = 'submitted'`; after triage it is read-only
  to them except through comments.

---

## 9. Maintenance Subscription Workflow

```
Agency configures plans (name, prices, services, allowances, response time, priority,
billing frequency, renewal period, active/public)
        │
        ▼
Subscription created for client+website: status trial|active, start_date, renewal_date,
allowances snapshotted onto the subscription row
        │
        ├── Usage accrues ──► maintenance_usage (change / support minutes)
        │       ├─ automatically when a covered change request or support ticket completes
        │       └─ manually by agency (is_manual_adjustment = true, always attributed)
        │
        ├── Allowance meters shown to client: included / used / remaining per period
        │       └─ crossing 80 % and 100 % raises notifications
        │
        ├── Renewal approaches ──► renewal_reminders materialised at the configured
        │       offsets (default 60/30/14/7/0 days) → agency dashboard
        │       └─ status auto-moves active → renewal_due inside the window
        │
        └── Client requests upgrade / downgrade / cancellation / renewal discussion
                └─ maintenance_plan_requests row (pending) — the subscription is NOT
                   modified. Agency approves → maintenance_events row + subscription update.
                   Nothing changes a subscription automatically without agency approval.

Statuses: trial → active → renewal_due → (renewed → active) | suspended | cancelled | expired
```

Every subscription mutation writes `maintenance_events` (immutable) **and** `audit_logs`.

---

## 10. Handover Workflow

```
Project reaches Launch Preparation
        ▼
Agency creates handover record (1:1 with project)
        ├─ Technical details: website URL, admin URL, CMS, hosting, domain, DNS,
        │  analytics, Search Console, backups, security, third-party services, licences
        ├─ Checklist instantiated from the agency template (16 default items, customisable)
        │  Domain confirmed · DNS configured · SSL active · Production hosting ·
        │  Backups · Analytics · Search Console · Forms tested · Email delivery ·
        │  Mobile testing · Browser testing · Accessibility · Performance ·
        │  Client approval · Training · Maintenance plan confirmed
        └─ Documents attached: user guides, training videos, documentation,
           brand guidelines, backup instructions, CMS guides
        ▼  all applicable items complete → status = ready
Agency delivers to client → status = delivered, client notified
        ▼
Client acceptance form — six explicit confirmations:
   website reviewed · requested changes completed · approved for launch ·
   handover materials received · training received (if applicable) ·
   maintenance arrangement understood
        ▼
client_acceptances row: approving user, date, time, project version, statement,
IP, user agent → audit_logs → status = accepted → project may move to Maintenance
```

**No credentials are ever stored as plain text.** Credential fields are replaced by guidance
telling the client to use an approved secure credential-sharing method; the same rule applies
to the Domain & Hosting onboarding section.

---

## 11. Recommended Component Structure

```
components/
  ui/            Button Badge Card Input Textarea Select Checkbox RadioGroup
                 Modal Drawer Tabs Table Pagination ProgressBar StatTile
                 Avatar Tooltip Toast EmptyState Skeleton Alert Breadcrumbs
                 DatePicker FileDropzone SearchInput FilterBar StatusPill
  layout/        AppShell SidebarNav MobileNav Topbar PageHeader SectionCard
                 ThemeToggle NotificationBell UserMenu
  clients/       ClientForm ClientCard ClientTable ClientSummary
  projects/      ProjectForm ProjectCard ProjectTable ProjectTabs StageStepper
                 ProgressBreakdown MilestoneTimeline HealthBadge
  planning/      PlanEditor DeliverableList RiskRegister MilestoneForm
  onboarding/    OnboardingNav SectionForm SectionStatusPill FieldRenderer
                 ColourPaletteField AssetRequirementList SubmitBar
  content/       SitemapTree PageContentForm PageStatusPill
  tasks/         TaskList TaskForm TaskCard PriorityPill DueDateBadge
  files/         FileUploader FileGrid FileRow ApprovalControls FilePreview
  change-requests/ ChangeRequestForm RequestTable StatusPill QuotePanel
                 ApprovalPanel RequestTimeline
  support/       SupportForm TicketTable UrgencyPill CoverageBadge
  maintenance/   PlanCard PlanEditor SubscriptionCard AllowanceMeter
                 UsageTable ReminderList PlanRequestPanel
  handover/      HandoverForm ChecklistEditor DocumentList AcceptanceForm
  comments/      CommentThread CommentForm CommentItem InternalToggle
  activity/      ActivityFeed ActivityItem AuditTable
  dashboard/     StatGrid AttentionList FilterPanel RecentProjects
```

Rules: server components by default; `'use client'` only where interactivity requires it
(forms, drag-drop, toggles). No component owns more than one responsibility. Forms share
zod schemas with the Server Actions that receive them, so validation cannot drift.

---

## 12. Recommended Implementation Order

| Phase | Deliverable |
|-------|-------------|
| **0** | Architecture doc (this file), setup guide, env template |
| **1** | Scaffold: Next.js, TypeScript, Tailwind, brand config, base styling |
| **2** | Database: enums → tables → indexes → triggers → RLS predicates → policies → storage |
| **3** | Seed data: agency, staff, 4 clients, 6 projects, full demo content |
| **4** | Supabase clients, generated types, auth guards, permission module, middleware |
| **5** | Design system primitives + app shells (agency sidebar, portal nav, mobile, dark mode) |
| **6** | Auth screens: login, invite acceptance, password reset |
| **7** | Clients & projects CRUD, project workspace shell |
| **8** | Dashboards: agency KPIs/filters/search, client portal home |
| **9** | Onboarding engine + sitemap/content |
| **10** | Tasks, files/media library, comments, approvals |
| **11** | Change requests incl. quote/approval workflow |
| **12** | Support requests |
| **13** | Maintenance plans, subscriptions, usage, plan requests, reminders |
| **14** | Handover, checklists, documents, client acceptance |
| **15** | Progress calculation, activity feed, notifications, audit log viewer |
| **16** | Accessibility pass, responsive pass, polish |

Each phase ends with a typecheck and a commit.
