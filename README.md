# Client Portal & Project Management

A secure client portal and project workspace for a web development agency —
onboarding, planning, files, approvals, change requests, support, maintenance
subscriptions and website handover in one place.

Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage) · Vercel-ready.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase keys
npm run dev
```

Without Supabase credentials the app shows a setup screen rather than an error.
**[docs/SETUP.md](docs/SETUP.md) is the full walkthrough** — creating the
Supabase project, pushing the schema, loading the seed, and deploying.

The short version:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push                    # 14 migrations: 40 tables, RLS, triggers, storage
# then paste supabase/seed.sql into the Supabase SQL Editor and run it
node scripts/seed-demo.mjs              # demo logins + a realistic book of work
npm run dev
```

---

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
./scripts/verify-schema.sh /var/run/postgresql 55432
```

Applies every migration plus the seed to a throwaway Postgres database and runs
**27 Row Level Security assertions** covering tenant isolation,
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
  migrations/     0001 … 0013
  seed.sql        agency-configurable reference data
scripts/          type generation, schema verification, demo seed
docs/             ARCHITECTURE.md, SETUP.md
```

## Rebranding

Everything visual is in `src/config/brand.ts` (name, tagline, initials, colour)
and the token block at the top of `src/app/globals.css`. Values that should
differ per deployment without a rebuild live in the `agency_settings` table.
