# Setup guide

Everything you need to take this repository from a fresh clone to a running
application on your own Supabase project.

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

1. Go to <https://supabase.com/dashboard> and click **New project**.
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

## 3. Push the database schema

From the repository root:

```bash
npx supabase login          # opens your browser once
npx supabase link --project-ref <your-project-ref>
npx supabase db push        # applies supabase/migrations/*.sql in order
```

`db push` will ask for the database password from step 2.

This creates 40 tables, 34 enum types, the permission functions, all Row Level
Security policies, the column guard triggers and the private storage bucket.

### Load the reference data

The seed adds agency settings, the 15 lifecycle stages, the 12-section
onboarding template, three example maintenance tiers and the 16-item handover
checklist. It is idempotent — running it twice changes nothing.

Either paste `supabase/seed.sql` into the dashboard's **SQL Editor** and run it,
or from the CLI:

```bash
psql "$(npx supabase status -o json | jq -r '.DB_URL')" -f supabase/seed.sql
```

> On a hosted project the simplest route is the SQL Editor: open
> `supabase/seed.sql`, copy the contents, paste, **Run**.

---

## 4. Add your keys

In the dashboard go to **Project Settings → API** and copy:

| Dashboard field | Goes into |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` key | `SUPABASE_SERVICE_ROLE_KEY` |

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REMINDER_SWEEP_SECRET=<any long random string>
```

**About the two keys.** The anon key is *designed* to be public — it can only
reach what Row Level Security allows, which for a signed-out visitor is nothing.
The service role key bypasses RLS entirely. It is read only inside
`src/lib/supabase/admin.ts`, which starts with `import 'server-only'`, so
importing it into browser code is a build error rather than a silent leak.
Never give it a `NEXT_PUBLIC_` prefix and never commit it.

---

## 5. Configure authentication URLs

**Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (your production domain later)
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/callback`
  - `https://your-production-domain.com/auth/callback`

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

Open <http://localhost:3000>.

---

## Deploying to Vercel

1. Push this repository to GitHub and import it at <https://vercel.com/new>.
2. Add the same four environment variables in **Settings → Environment
   Variables**, with `NEXT_PUBLIC_SITE_URL` set to your Vercel domain.
3. Add `https://<your-domain>/auth/callback` to the Supabase redirect URLs.
4. Deploy.

### Renewal reminders

`POST /api/reminders/sweep` moves subscriptions into `renewal_due`, expires
lapsed ones, and surfaces reminders that have reached their notification
window. It is idempotent, so it is safe to run as often as you like.

Add to `vercel.json` to run it daily:

```json
{ "crons": [{ "path": "/api/reminders/sweep", "schedule": "0 7 * * *" }] }
```

The endpoint requires `Authorization: Bearer $REMINDER_SWEEP_SECRET`.

---

## Verifying the schema without Supabase

If you have PostgreSQL 16 available locally, you can apply every migration and
run the security assertions against a throwaway database:

```bash
./scripts/verify-schema.sh /var/run/postgresql 55432
```

It applies `scripts/supabase-stubs.sql` (stand-ins for the parts Supabase
provides), then every migration, the seed, and 23 Row Level Security assertions
covering tenant isolation, internal-comment visibility, cross-tenant writes,
column guards, privilege escalation, audit-log immutability and anonymous
access.

---

## Troubleshooting

**"Finish setting up" screen appears.** `NEXT_PUBLIC_SUPABASE_URL` or
`NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing from `.env.local`. Restart the dev
server after editing it — Next.js reads env files at startup.

**Invitation link says it has expired.** The redirect URL is not in the Supabase
allow-list (step 5), or the invitation is genuinely older than 14 days.

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
