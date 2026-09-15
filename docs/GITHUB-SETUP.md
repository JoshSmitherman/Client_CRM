# Setting up — step by step

Written for someone who has never used Supabase or GitHub Actions before.
Every link below goes straight to the page you need. Nothing gets installed on
your computer.

**Total time: about 15 minutes.** Most of it is waiting for Supabase.

There are six steps:

1. [Create a Supabase project](#step-1--create-a-supabase-project)
2. [Copy your three keys](#step-2--copy-your-three-keys)
3. [Add the keys to GitHub](#step-3--add-the-keys-to-github)
4. [Create the database tables](#step-4--create-the-database-tables)
5. [Allow the sign-in links](#step-5--allow-the-sign-in-links)
6. [Create your first login](#step-6--create-your-first-login)
7. [Put it on the internet](#step-7--put-it-on-the-internet)

---

## Step 1 — Create a Supabase project

Supabase is the database and login system this app runs on. The free tier is
enough to get going.

1. Go to **<https://supabase.com/dashboard/sign-up>** and create an account
   (you can sign in with GitHub).
2. Go to **<https://supabase.com/dashboard/new>** to start a new project.
3. Fill the form in:
   - **Name** — anything, e.g. `client-portal`
   - **Database Password** — click *Generate a password*, then
     **copy it somewhere safe now**. You may need it later and it is not shown
     again.
   - **Region** — the one closest to you. For the UK choose
     `West EU (London)`.
4. Click **Create new project**.

It takes about two minutes to finish setting up. Wait until the dashboard stops
saying "Setting up project".

---

## Step 2 — Copy your three keys

These are the details that let the app talk to your database.

Open **<https://supabase.com/dashboard/project/_/settings/api>**

(If it asks which project, pick the one you just made.)

You need three values from this page. Open a blank note and paste each one in
as you go — you will need them all in step 3.

| On the Supabase page, look for | Paste it under this name |
|---|---|
| **Project URL** — looks like `https://abcdefgh.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **Project API keys → `anon` `public`** — a very long string starting `eyJ...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Project API keys → `service_role` `secret`** — click *Reveal* first | `SUPABASE_SERVICE_ROLE_KEY` |

> **Is it safe to have two keys?** Yes, and they do different jobs.
>
> The **anon key** is meant to be public — it gets built into the web page
> itself. On its own it can read nothing, because the database refuses every
> request that is not from a signed-in user with permission. That protection is
> called Row Level Security and it is switched on for all 40 tables.
>
> The **service_role key** ignores all of that and can see everything. Treat it
> like a master password: never paste it into a website, a chat, or a file you
> commit. It is used in exactly two places — on the server, and by the GitHub
> Action that creates your first login.

---

## Step 3 — Add the keys to GitHub

GitHub "secrets" are a safe place to store the keys. They are encrypted, and
nobody can read them back out once saved — not even you.

Open **<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions/new>**

You will add three secrets, one at a time. For each one:

1. **Name** — type the name exactly as shown below (capitals and underscores matter)
2. **Secret** — paste the matching value from your note
3. Click **Add secret**
4. Click **New repository secret** to add the next one

The three to add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your `service_role` `secret` key |

When you are done, **<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions>**
should list all three. You will see the names but not the values — that is
correct and expected.

---

## Step 4 — Create the database tables

Your database is empty right now. This step creates everything: 40 tables, all
the security rules, and the starting data (project stages, the onboarding
questionnaire, example maintenance plans, the handover checklist).

**Choose one of the two options below.** They do exactly the same thing.

### Option A — paste the file in (recommended, nothing else to set up)

1. Open the SQL file:
   **<https://github.com/JoshSmitherman/Client_CRM/blob/claude/inspiring-allen-snxv3i/supabase/setup.sql>**
2. Click the **Copy raw file** button (the two-squares icon at the top right of
   the file). If you cannot find it, open the
   [plain text version](https://raw.githubusercontent.com/JoshSmitherman/Client_CRM/claude/inspiring-allen-snxv3i/supabase/setup.sql)
   instead and select all (`Ctrl+A` / `Cmd+A`) then copy.
3. Open the Supabase SQL editor:
   **<https://supabase.com/dashboard/project/_/sql/new>**
4. Click into the big empty box and paste.
5. Click **Run** (bottom right, or press `Ctrl+Enter` / `Cmd+Enter`).

It takes a few seconds. You want to see **Success. No rows returned** at the
bottom. That is what success looks like for this kind of script — it creates
things rather than returning results.

> **If it fails partway through**, just run it again. The whole file is written
> so it can be re-run safely: it skips anything that already exists and never
> creates a duplicate.

To check it worked, open
**<https://supabase.com/dashboard/project/_/editor>** — you should see a long
list of tables down the left: `activity_logs`, `audit_logs`, `change_requests`,
`clients`, and so on.

### Option B — let GitHub do it

Only worth it if you would rather not copy and paste. It needs one extra secret.

1. Open **<https://supabase.com/dashboard/project/_/settings/database>**
2. Scroll to **Connection string**, choose the **URI** tab, and copy it
3. In that string, replace `[YOUR-PASSWORD]` with the database password from
   step 1
4. Add it as a secret named `SUPABASE_DB_URL` at
   **<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions/new>**
5. Open **<https://github.com/JoshSmitherman/Client_CRM/actions/workflows/database-setup.yml>**
6. Click **Run workflow** (right-hand side), type `apply` in the confirmation
   box, and click the green **Run workflow** button
7. Wait for the green tick

---

## Step 5 — Allow the sign-in links

Supabase will refuse to send people back to your app after they click a login
or invitation link unless you list the address first. Skipping this is the most
common reason invitations appear broken.

1. Open **<https://supabase.com/dashboard/project/_/auth/url-configuration>**
2. **Site URL** — set it to `http://localhost:3000`
   (change this to your real web address later, once the site is live)
3. Under **Redirect URLs**, click **Add URL** and enter:
   ```
   http://localhost:3000/auth/callback
   ```
4. Click **Add URL** again and add your future live address too, if you know it:
   ```
   https://your-domain.com/auth/callback
   ```
5. Click **Save**

---

## Step 6 — Create your first login

The database has tables but nobody in it yet. **The first person to register
becomes the agency administrator** — that is you.

1. Deploy the app first (step 7), or run it locally with `npm run dev`
2. Go to `/signup`
3. Enter your name, work email address and a password
4. You are signed in as the administrator

That happens exactly once. Everyone after you either needs an invitation, or an
email address on a domain you approve in Settings.

### Then set up how the rest of your team gets in

In the app, go to **Settings → Agency → Staff access**:

- **Approved email domains** — put your agency's domain in, e.g.
  `youragency.co.uk`. Anyone signing up from a different domain gets an account
  that can see nothing at all.
- **Self-registration** — choose whether an approved domain is active straight
  away, or waits for you to approve it (**Settings → Team** shows the queue).
- **Role new staff get** — you can change anyone's role afterwards.

### Client logins

Clients never register themselves. Create them from inside the platform:
**Settings → Team → Invite someone**, choose a client role, and pick which
client they belong to. They get an email with a link to set their own password,
and can only ever see that one client's projects and files.

### Want example data to look around first?

[Actions → Seed demo data → Run workflow](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/seed-demo.yml)
creates four example clients with projects, tasks, requests and maintenance
plans. Run it again with `demo-reset` to remove it all later.

## Step 7 — Put it on the internet

**This cannot be hosted on GitHub Pages.** GitHub Pages serves static files and
has no server; this application needs one on every request — most importantly to
keep the Supabase service role key away from the browser. Without that, creating
client logins would mean shipping a key that bypasses every permission rule to
anyone who opens developer tools.

**[docs/DEPLOYMENT.md](DEPLOYMENT.md) explains the options.** The short version:

| Host | Effort | Note |
|---|---|---|
| [Vercel](https://vercel.com/new) | 5 minutes | No configuration needed. Free plan is non-commercial only — check their terms |
| [Netlify](https://app.netlify.com/start) | 10 minutes | Free tier allows commercial use |
| Cloudflare Workers | ~1 hour | Cheapest at scale, needs an adapter |

Whichever you choose, set these four environment variables:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your `anon` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your `service_role` key |
| `NEXT_PUBLIC_SITE_URL` | Your live address, once you have it |
| `REMINDER_SWEEP_SECRET` | Any long random string |

Then add `https://your-address/auth/callback` to the Supabase
[redirect URLs](https://supabase.com/dashboard/project/_/auth/url-configuration).

## What runs on its own

Every time the code changes, GitHub checks it: **<https://github.com/JoshSmitherman/Client_CRM/actions/workflows/ci.yml>**

- The TypeScript compiles, the linter is clean, and the app builds
- The whole database script is applied twice to a throwaway database, to prove
  a re-run is safe
- **27 security checks** run — that one client cannot see another's data, that
  internal notes never reach a client, that a client cannot approve their own
  files or change a price, and that the audit log cannot be edited by anyone

If any of that breaks, the tick goes red before it reaches you.

---

## If something goes wrong

**The app shows "Finish setting up".**
The three keys are missing wherever the app is running. Locally that is the
`.env.local` file; on Vercel it is **Settings → Environment Variables**. After
changing them you must restart (or redeploy) — the keys are only read at startup.

**The seed workflow fails saying "Could not read lifecycle_stages".**
Step 4 has not finished. Go back and run the SQL script.

**The seed workflow fails saying a secret is not set.**
Check the three names at
**<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions>** —
they are case-sensitive and a stray space at the start or end of a pasted value
will break them. If in doubt, delete the secret and add it again.

**An invitation or reset link says it has expired.**
Either the address is not in the Redirect URLs list (step 5), or the invitation
really is more than 14 days old. Send a new one.

**Signing in says "Your account is not active yet".**
One of two things. Either the account registered from an email domain you have
not approved, in which case it deliberately has no access — invite the address
properly instead. Or it registered from an approved domain while
self-registration is set to "I approve each one", in which case approve it at
**Settings → Team**.

**The database workflow cannot connect.**
`SUPABASE_DB_URL` still has `[YOUR-PASSWORD]` in it, or the password is wrong.
Copy the connection string again from
**<https://supabase.com/dashboard/project/_/settings/database>**.

**Running the SQL gives "relation already exists".**
Nothing is wrong — you have already run it. It is safe to leave as it is.
