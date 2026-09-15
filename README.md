# Client Portal & Project Management

A secure client portal and project workspace for a web development agency —
onboarding, planning, files, approvals, change requests, support, maintenance
subscriptions and website handover in one place.

Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Vercel-ready.

---

## Getting started

**Nothing to install.** Six steps, all in your browser, about 15 minutes:

| # | Step | Where |
|---|---|---|
| 1 | Create a Supabase project | [supabase.com/dashboard/new](https://supabase.com/dashboard/new) |
| 2 | Copy your three keys | [Project Settings → API](https://supabase.com/dashboard/project/_/settings/api) |
| 3 | Add them as GitHub secrets | [Settings → Secrets → Actions](https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions/new) |
| 4 | Create the tables — paste one SQL file | [supabase/setup.sql](https://github.com/JoshSmitherman/Client_CRM/blob/claude/inspiring-allen-snxv3i/supabase/setup.sql) → [SQL Editor](https://supabase.com/dashboard/project/_/sql/new) |
| 5 | Allow the sign-in links | [Auth → URL Configuration](https://supabase.com/dashboard/project/_/auth/url-configuration) |
| 6 | Create your first login | [Actions → Seed demo data](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/seed-demo.yml) |

**→ [docs/GITHUB-SETUP.md](docs/GITHUB-SETUP.md) has each step written out in
full, with a link for every click.**

<details>
<summary>Running it locally instead</summary>

```bash
npm install
cp .env.example .env.local          # fill in your Supabase keys
npm run dev
```

For the database, either paste
[`supabase/setup.sql`](supabase/setup.sql) into the
[Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new), or use
the CLI:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
node scripts/seed-demo.mjs          # demo logins and a book of work
```

[docs/SETUP.md](docs/SETUP.md) is the detailed local walkthrough. Without
Supabase credentials the app shows a setup screen rather than an error.

</details>

## What is built

| Area | State |
|---|---|
| Database schema, RLS, audit, storage policies | Complete and verified |
| Authentication, invite-only provisioning, route guards | Complete |
| Design system, app shells, light/dark, mobile | Complete |
| Agency dashboard (KPIs, filters, search, attention lists) | Complete |
| Clients — list, create, edit, detail | Complete |
| Projects — list, create, 13-tab workspace, lifecycle, progress | Workspace shell + Overview, Tasks, Files, Onboarding, Changes, Comments, Activity |
| Tasks, files/media library, threaded comments, approvals | Complete |
| Onboarding engine (12 sections, review workflow) | Complete |
| Change requests incl. quotation and client approval | Complete |
| Support requests | Actions complete; screens in progress |
| Maintenance plans, subscriptions, usage, reminders | Schema + usage accrual complete; screens in progress |
| Handover, checklists, client acceptance | Schema complete; screens in progress |
| Client portal | In progress |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

---

## Security model

Row Level Security is the boundary, not the UI.

- RLS is enabled **and forced** on all 40 tables.
- Access is decided by SQL predicates (`can_access_project`,
  `can_access_client`, `can_edit_project`) that also govern storage objects, so
  a leaked object key is useless without an authorised session.
- RLS chooses *rows* but cannot restrict *columns*, so column guard triggers
  stop a client PATCHing a row they may legitimately update and setting a
  commercial, approval or triage field.
- A policy sees the old row or the new row but never both, so legal state
  transitions live in a trigger — a client cannot move their own untriaged
  change request straight to "approved".
- Internal comments are excluded in the SELECT policy itself, not by an
  application filter.
- `audit_logs` has no insert, update or delete policy for anyone; rows arrive
  only through `record_audit()`.
- The service role key is read in exactly one module, which begins with
  `import 'server-only'` — importing it into browser code is a build error.

### Verifying it

```bash
./scripts/verify-schema.sh              # local
./scripts/verify-schema.sh localhost 5432
```

This also runs on every push. See the **CI** workflow.

Applies every migration twice to a throwaway Postgres database — then the
generated `setup.sql` twice, since that file is pasted in by hand and a retry
after a half-finished run is normal — and runs **27 Row Level Security
assertions** covering tenant isolation,
internal-comment visibility, cross-tenant writes, column guards, state
transitions, privilege escalation, audit-log immutability, agency member
scoping and anonymous access.

---

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:push` | Push migrations to the linked Supabase project |
| `node scripts/generate-types.mjs` | Regenerate `database.types.ts` from a live schema |
| `node scripts/seed-demo.mjs` | Create demo logins and data |
| `node scripts/seed-demo.mjs --reset` | Wipe demo rows and re-seed |
| `node scripts/build-setup-sql.mjs` | Rebuild `supabase/setup.sql` from the migrations |
| `./scripts/verify-schema.sh` | Apply migrations to a scratch DB and run the RLS assertions |

---

## Layout

```
src/
  app/(auth)      login, invite acceptance, password reset
  app/(agency)    dashboard, clients, projects, change requests, support,
                  maintenance, tasks, files, notifications, settings
  app/(portal)    the client-facing portal
  components/ui   design system primitives
  components/*    one folder per domain
  lib/actions     Server Actions — validate, authorise, mutate, audit, notify
  lib/queries     typed read helpers for Server Components
  lib/validation  zod schemas shared by forms and actions
supabase/
  migrations/     0001 … 0013, applied by the Supabase CLI
  seed.sql        agency-configurable reference data
  setup.sql       generated: every migration + the seed, as one pasteable file
.github/workflows CI, database setup, demo seeding, deployment
scripts/          type generation, schema verification, demo seed
docs/             ARCHITECTURE.md, SETUP.md
```

## Rebranding

Everything visual is in `src/config/brand.ts` (name, tagline, initials, colour)
and the token block at the top of `src/app/globals.css`. Values that should
differ per deployment without a rebuild live in the `agency_settings` table.
