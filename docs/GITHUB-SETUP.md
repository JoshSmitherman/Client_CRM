# Setting up from GitHub

Two things to do. Nothing needs to be installed on your machine.

1. **Add three secrets** to this repository
2. **Run the database setup** — either paste one SQL file, or run a workflow

Then run the "Seed demo data" workflow to create your first login.

---

## Step 1 — Create a Supabase project

<https://supabase.com/dashboard> → **New project**.

- Give it a name, and **save the database password** — you need it in step 3.
- Pick the region closest to you (for the UK, `eu-west-2 London`).
- Wait about two minutes for it to finish provisioning.

---

## Step 2 — Add the secrets

In this repository: **Settings → Secrets and variables → Actions → New repository secret**.

Add these three. All of them come from your Supabase project under
**Project Settings → API**.

| Secret name | Where to find it | What it is |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → **Project URL** | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → **anon public** | Safe to expose — Row Level Security decides what it can reach |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role secret** | Bypasses all security. Never put this anywhere public |

One more, only if you want the database set up by a workflow rather than by
pasting SQL yourself:

| Secret name | Where to find it |
|---|---|
| `SUPABASE_DB_URL` | Project Settings → **Database** → Connection string → **URI**. Replace `[YOUR-PASSWORD]` with the password from step 1 |

> **On the two keys.** The anon key is *designed* to be public — it is compiled
> into the browser bundle and can only reach what Row Level Security allows,
> which for a signed-out visitor is nothing at all. The service role key
> bypasses RLS entirely; it is read in one server-only module and used by the
> seeding workflow, and never reaches a browser.

---

## Step 3 — Set up the database

Pick whichever you prefer. Both do exactly the same thing, and both are safe to
run more than once.

### Option A — paste the SQL (no extra secret needed)

1. Open [`supabase/setup.sql`](../supabase/setup.sql) and copy the whole file
2. In Supabase: **SQL Editor → New query**
3. Paste, press **Run**

### Option B — run the workflow (needs `SUPABASE_DB_URL`)

**Actions → Set up the database → Run workflow**, type `apply` in the
confirmation box, and run it.

Either way you end up with 40 tables, 34 enum types, the permission functions,
every Row Level Security policy, the column guard triggers, the private storage
bucket, and the reference data: 15 lifecycle stages, the 12-section onboarding
template, three example maintenance tiers and the 16-item handover checklist.

No user accounts are created — that is the next step.

---

## Step 4 — Allow the sign-in links

In Supabase: **Authentication → URL Configuration**.

- **Site URL**: `http://localhost:3000`, or your deployed domain
- **Redirect URLs**: add both
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

Invitation and password-reset links will not work until these are added.

---

## Step 5 — Create your first login

**Actions → Seed demo data → Run workflow.**

| Mode | What it does |
|---|---|
| `demo` | Agency staff, four clients, four projects, tasks, onboarding, change requests, support tickets, maintenance subscriptions with usage, and a handover pack |
| `demo-reset` | Removes the demo rows first, then re-seeds. Use this to start over |
| `admin-only` | Creates one agency administrator and nothing else. Use this for a real agency account |

Fill in **Administrator email** to choose your own login address, and
**Password** to set your own — otherwise it uses the defaults and prints them
in the workflow log.

Open the workflow run to see the accounts it created.

> Change the seeded passwords before the site is reachable by anyone.

---

## Step 6 — Deploy

The simplest route needs no secrets here at all: connect the repository at
[vercel.com/new](https://vercel.com/new), and add the same three Supabase
values as environment variables in the Vercel dashboard, plus
`NEXT_PUBLIC_SITE_URL` set to your Vercel domain.

If you would rather deploy from Actions, the `Deploy to Vercel` workflow does
it with `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID`. Without
`VERCEL_TOKEN` it skips quietly rather than failing.

---

## What runs automatically

The **CI** workflow runs on every push:

- typecheck, lint and a production build
- every migration applied twice to a scratch Postgres database, then
  `setup.sql` twice, then **27 Row Level Security assertions** — tenant
  isolation, internal-comment visibility, cross-tenant writes, column guards,
  change-request state transitions, privilege escalation, audit-log
  immutability, agency member scoping and anonymous access
- a check that `supabase/setup.sql` still matches the migrations, so the file
  you paste can never drift from the source

---

## Troubleshooting

**"Finish setting up" appears instead of the app.** The Supabase environment
variables are missing where the app is running. Locally that means `.env.local`;
on Vercel it means the project's environment variables. Restart after changing
them — Next.js reads env files at startup.

**The seed workflow fails with "Could not read lifecycle_stages".** Step 3 has
not run yet, or it did not finish.

**Invitation link says it has expired.** The redirect URL is not in the Supabase
allow-list (step 4), or the invitation really is older than 14 days.

**"Your account is not active yet" after signing in.** The account was created
without a matching invitation, so it deliberately has no organisation and no
access. Invite the address properly, or re-run the seed workflow.

**The database workflow fails to connect.** `SUPABASE_DB_URL` still contains the
`[YOUR-PASSWORD]` placeholder, or it is the direct connection string rather than
the pooler URI.
