# Setup guide (local)

Everything you need to take this repository from a fresh clone to a running
application on your own Supabase project.

> **Prefer not to install anything?** [docs/GITHUB-SETUP.md](GITHUB-SETUP.md)
> does the same job entirely in the browser, with a direct link for every click:
> add a few repository secrets, paste one SQL file, turn Pages on. Come back
> here if you want it running locally.

Nothing here requires you to share credentials with anyone. Keys stay in your
`.env.local`, which is git-ignored.

---

## 1. Prerequisites

- **Node.js 20 or newer** (`node --version`)
- **A Supabase account** — the free tier is enough: <https://supabase.com>
- No global installs needed; the Supabase CLI runs through `npx`.

```bash
npm install
```

---

## 2. Create your Supabase project

1. Go to <https://supabase.com/dashboard/new>.
2. Choose an organisation, give the project a name (e.g. `agency-portal`),
   and set a **database password** — save it somewhere safe, you will need it
   in step 3.
3. Pick the region closest to you (for the UK, `eu-west-2 London`).
4. Wait for provisioning to finish (about two minutes).

Once it is ready, find your **project reference**: it is the part of the
dashboard URL after `/project/`, e.g. in
`https://supabase.com/dashboard/project/abcdefghijklmnop` the reference is
`abcdefghijklmnop`.

---

## 3. Set up the database

### The quick way — one SQL file

Open [`supabase/setup.sql`](../supabase/setup.sql), copy the whole thing, and
run it at <https://supabase.com/dashboard/project/_/sql/new>. That is the entire database: 41 tables, the permission
functions, every Row Level Security policy, the guard triggers, the storage
bucket and the reference data. It is safe to run more than once.

Skip to step 4 if you take this route.

### The CLI way

From the repository root:

```bash
npx supabase login          # opens your browser once
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies supabase/migrations/*.sql in order
```

`db push` will ask for the database password from step 2.

This creates 41 tables, 34 enum types, the permission functions, all Row Level
Security policies, the column guard triggers and the private storage bucket.

`db push` applies the migrations but not the seed, so load the reference data
too — agency settings, the 15 lifecycle stages, the 12-section onboarding
template, three example maintenance tiers and the 16-item handover checklist.
Paste [`supabase/seed.sql`](../supabase/seed.sql) into the
[SQL Editor](https://supabase.com/dashboard/project/_/sql/new) and run it. It is idempotent,
so running it twice changes nothing.

---

## 4. Add your keys

Open <https://supabase.com/dashboard/project/_/settings/api> and copy:

| Dashboard field | Goes into |
|---|---|
| Project URL | `VITE_SUPABASE_URL` |
| `anon` `public` key | `VITE_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```ini
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Not used by the application. Only scripts/seed-demo.mjs reads this.
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

**About the two keys.** The anon key is *designed* to be public — it is compiled
into the bundle, and can only reach what Row Level Security allows, which for a
signed-out visitor is nothing.

The service role key bypasses Row Level Security entirely. Nothing under `src/`
reads it, and `VITE_` is the only prefix Vite exposes to the browser, so a key
without that prefix cannot end up in the bundle by accident. It is used by the
demo seed script here, and by the `invite-user` Edge Function in production.
Never rename it with a `VITE_` prefix, and never commit it.

---

## 5. Configure authentication URLs

Open <https://supabase.com/dashboard/project/_/auth/url-configuration>:

- **Site URL**: `http://localhost:5173` (your production address later)
- **Redirect URLs**: add both
  - `http://localhost:5173/**`
  - `https://your-production-address/**`

The `**` matters: invitation and password-reset links return people to a
specific page, and Supabase refuses any address not covered here.

Invitation and password-reset links will not work until these are set.

---

## 6. Create the demo data and your first login

```bash
node scripts/seed-demo.mjs
```

This uses your service role key to create the demo agency staff and client
logins, then inserts a realistic book of work: clients, projects at different
lifecycle stages, onboarding progress, tasks, files, comments, milestones,
change requests, support tickets, maintenance subscriptions with usage, and a
handover package.

It prints the logins when it finishes. To start from scratch instead:

```bash
node scripts/seed-demo.mjs --reset   # deletes demo rows, then re-seeds
```

To create only an administrator and no demo content:

```bash
node scripts/seed-demo.mjs --admin-only --email you@youragency.com
```

---

## 7. Run it

```bash
npm run dev
```

Open <http://localhost:5173>.

To check what will actually be deployed:

```bash
npm run build && npm run preview
```

---

## 8. Invitations, locally

**Settings → Team → Invite someone** calls a Supabase Edge Function, because
issuing a login needs the service role key and that must never be in a browser
bundle. Everything else works without it.

Deploy it to your project once:

```bash
npx supabase login
npx supabase functions deploy invite-user --project-ref <your-project-ref>
```

Nothing to configure afterwards — Supabase provides the function with its own
`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## Deploying

[docs/DEPLOYMENT.md](DEPLOYMENT.md) covers the options;
[docs/GITHUB-SETUP.md](GITHUB-SETUP.md) walks through GitHub Pages click by
click. The build is `npm run build`, the output is `dist/`, and the only two
build-time variables are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Renewal reminders

`public.sweep_maintenance_state()` moves subscriptions into `renewal_due`,
expires lapsed ones, and surfaces reminders that have reached their
notification window. It is idempotent, so it is safe to run as often as you
like.

The Maintenance screen calls it whenever an agency user opens it, and
`.github/workflows/maintenance-sweep.yml` calls it daily. Any cron that can
reach the database works just as well:

```bash
psql "$SUPABASE_DB_URL" -c "select public.sweep_maintenance_state()"
```

---

## Verifying the schema without Supabase

If you have PostgreSQL 16 available locally, you can apply every migration and
run the security assertions against a throwaway database:

```bash
./scripts/verify-schema.sh              # local socket
./scripts/verify-schema.sh localhost 5432
```

It applies `scripts/supabase-stubs.sql` (stand-ins for the parts Supabase
provides), then every migration **twice**, then the generated `setup.sql`
twice, then 47 Row Level Security assertions covering tenant isolation,
internal notes and comments, cross-tenant writes, column guards,
change-request state transitions, privilege escalation, audit-log immutability,
agency member scoping, the staff signup ladder and anonymous access.

The same thing runs on every push — see the **CI** workflow.

### Checking the built site

```bash
npx playwright install chromium     # once
npm run smoke
```

Builds twice — once for the domain root, once for a `/<repo>/` sub-path — serves
each the way GitHub Pages does, and walks the routes in a real browser. It is
the only check that covers the single-page fallback, which is plain script with
no types to protect it. Set `CHROMIUM_PATH` to use a browser already on the
machine.

### Changing the schema

Edit the files in `supabase/migrations/`, then regenerate the single-file
script and the TypeScript types:

```bash
node scripts/build-setup-sql.mjs
node scripts/generate-types.mjs          # against a database with the schema applied
```

CI fails if `supabase/setup.sql` no longer matches the migrations, so the file
people paste can never drift from the source.

---

## Troubleshooting

**"Finish setting up" screen appears.** `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY` is missing from `.env.local`. Restart the dev server
after editing it — Vite reads env files at startup.

**Invitation link says it has expired.** The redirect URL is not in the Supabase
allow-list (step 5), or the invitation is genuinely older than 14 days.

**"Invite someone" returns an error about the Edge Function.** It has not been
deployed to your project — see step 8.

**"Your account is not active yet" after signing in.** The account was created
without a matching invitation, so it deliberately has no organisation and no
access. Invite the address properly from **Settings → Team**, or re-run the
demo seed.

**`db push` says the migration history is out of sync.** You have applied
migrations by hand as well. `npx supabase migration repair --status applied
<version>` reconciles it.

**Row Level Security errors when querying from the SQL Editor.** Expected: the
editor connects as `postgres`, which sees everything, but PostgREST connects as
`authenticated`. Test permissions through the application, or use
`scripts/rls-tests.sql` as a template for impersonating a user.
