# Setting up — step by step

Written for someone who has never used Supabase or GitHub Actions before.
Every link below goes straight to the page you need. Nothing gets installed on
your computer.

**Total time: about 20 minutes.** Most of it is waiting for Supabase.

There are eight steps:

1. [Create a Supabase project](#step-1--create-a-supabase-project)
2. [Copy your keys](#step-2--copy-your-keys)
3. [Add the keys to GitHub](#step-3--add-the-keys-to-github)
4. [Create the database tables](#step-4--create-the-database-tables)
5. [Put the site on the internet](#step-5--put-the-site-on-the-internet)
6. [Allow the sign-in links](#step-6--allow-the-sign-in-links)
7. [Turn on invitations](#step-7--turn-on-invitations)
8. [Create your first login](#step-8--create-your-first-login)

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
     **copy it somewhere safe now**. You need it in step 4 and it is not shown
     again.
   - **Region** — the one closest to you. For the UK choose
     `West EU (London)`.
4. Click **Create new project**.

It takes about two minutes to finish setting up. Wait until the dashboard stops
saying "Setting up project".

---

## Step 2 — Copy your keys

These are the details that let the app talk to your database.

Open **<https://supabase.com/dashboard/project/_/settings/api>**

(If it asks which project, pick the one you just made.)

Open a blank note and paste each value in as you go — you need them all in
step 3.

| On the Supabase page, look for | Paste it under this name |
|---|---|
| **Project URL** — looks like `https://abcdefgh.supabase.co` | `VITE_SUPABASE_URL` |
| **Project API keys → `anon` `public`** — a very long string starting `eyJ...` | `VITE_SUPABASE_ANON_KEY` |
| **Project API keys → `service_role` `secret`** — click *Reveal* first | `SUPABASE_SERVICE_ROLE_KEY` |

Also note the **project reference** — the `abcdefgh` part of your Project URL,
before `.supabase.co`. You need it in step 7.

> **Is it safe for the anon key to be in a public web page?** Yes — that is what
> it is for, and it is the reason this can be hosted on GitHub Pages at all.
>
> The **anon key** only says *which project* you are talking to. It grants no
> access on its own. Every read and write is checked inside the database
> against the signed-in person's own token, by rules called Row Level Security,
> which are switched on and forced for all 41 tables. A stranger holding this
> key and no login can reach nothing at all.
>
> The **service_role key** is the opposite: it ignores every rule and can see
> everything. Treat it like a master password. It never goes near the browser.
> It is used in exactly two places — inside the Supabase function that sends
> invitations (step 7), and by the GitHub Action that creates demo data.

---

## Step 3 — Add the keys to GitHub

GitHub "secrets" are a safe place to store these. They are encrypted, and
nobody can read them back out once saved — not even you.

Open **<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions/new>**

For each secret below:

1. **Name** — type it exactly as shown (capitals and underscores matter)
2. **Secret** — paste the matching value from your note
3. Click **Add secret**
4. Click **New repository secret** to add the next one

Add these three now:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your `service_role` `secret` key |

When you are done, **<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions>**
should list all three. You will see the names but not the values — that is
correct and expected.

---

## Step 4 — Create the database tables

Your database is empty right now. This step creates everything: 41 tables, all
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

> Adding `SUPABASE_DB_URL` is worth doing either way: it is also what the daily
> [maintenance sweep](#what-runs-on-its-own) uses.

---

## Step 5 — Put the site on the internet

The site is plain files — HTML, JavaScript and CSS — so GitHub Pages can host
it for free, from this repository, with nothing else to pay for or manage.

1. Open **<https://github.com/JoshSmitherman/Client_CRM/settings/pages>**
2. Under **Build and deployment → Source**, choose **GitHub Actions**
   (not "Deploy from a branch")
3. That is the only setting. There is nothing to save.

Publishing happens by itself. Every push to `main` — or to the
`claude/inspiring-allen-snxv3i` development branch, while the work is still
there — rebuilds and republishes the site.

To watch it, or to run it again by hand:

1. Open **<https://github.com/JoshSmitherman/Client_CRM/actions/workflows/pages.yml>**
2. The most recent run is at the top. Click it to see progress.
3. To run it again: click **Run workflow** (right-hand side), choose the branch,
   and click the green **Run workflow** button. It takes about a minute.

> **If the run says "Not deploying yet"**, the keys from step 3 are missing.
> The workflow says so and stops rather than failing, so add them and run it
> again.

> The **Run workflow** button only appears once this workflow file exists on
> your default branch. Until then, the automatic run on each push is what
> publishes the site.

Your site is now at:

**<https://joshsmitherman.github.io/Client_CRM/>**

Copy that address down; step 6 needs it.

> **Why the `/Client_CRM/` on the end?** GitHub serves a repository site from a
> folder named after the repository. The build is told about that folder so
> every link and file works; you do not have to do anything.

> **A public repository is fine.** Nothing secret is in it. The keys live in
> GitHub secrets, and the one key that must stay private never leaves Supabase.

---

## Step 6 — Allow the sign-in links

Supabase will refuse to send people back to your app after they click a login
or invitation link unless you list the address first. Skipping this is the most
common reason invitations appear broken.

1. Open **<https://supabase.com/dashboard/project/_/auth/url-configuration>**
2. **Site URL** — set it to your address from step 5:
   ```
   https://joshsmitherman.github.io/Client_CRM
   ```
3. Under **Redirect URLs**, click **Add URL** and enter:
   ```
   https://joshsmitherman.github.io/Client_CRM/**
   ```
   The `**` on the end matters — it lets Supabase return people to any page of
   the app, which is how invitation and password-reset links land in the right
   place.
4. If you also want to run the app on your own computer, click **Add URL**
   again and add:
   ```
   http://localhost:5173/**
   ```
5. Click **Save**

---

## Step 7 — Turn on invitations

Everything works without this step except one button: **Invite someone**.

Creating a login for somebody needs the service role key — the one that
bypasses every permission rule. It must never be inside a web page, so that
single operation runs on Supabase instead, in a small function that checks who
you are and whom you are allowed to invite before it does anything.

You need two more secrets.

1. Open **<https://supabase.com/dashboard/account/tokens>**
2. Click **Generate new token**, give it any name, and copy the value
3. Add it at
   **<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions/new>**
   as:

   | Name | Value |
   |---|---|
   | `SUPABASE_ACCESS_TOKEN` | The token you just generated |

4. Add one more, the project reference you noted in step 2 (the `abcdefgh`
   part of your Project URL):

   | Name | Value |
   |---|---|
   | `SUPABASE_PROJECT_REF` | e.g. `abcdefgh` |

5. Open **<https://github.com/JoshSmitherman/Client_CRM/actions/workflows/deploy-function.yml>**
6. Click **Run workflow**, choose the branch, then the green **Run workflow**
   button. (If there is no such button, push any change to
   `supabase/functions/` and it runs by itself.)
7. Wait for the green tick

To check it is there, open
**<https://supabase.com/dashboard/project/_/functions>** — you should see
`invite-user` listed.

---

## Step 8 — Create your first login

The database has tables but nobody in it yet. **The first person to register
becomes the agency administrator** — that is you.

1. Go to **<https://joshsmitherman.github.io/Client_CRM/signup>**
2. Enter your name, work email address and a password
3. Check your email and click the confirmation link
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
and can only ever see that one client's projects, files and requests.

### Want example data to look around first?

[Actions → Seed demo data → Run workflow](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/seed-demo.yml)
creates four example clients with projects, tasks, requests and maintenance
plans. Run it again with `demo-reset` to remove it all later.

---

## What runs on its own

Every time the code changes, GitHub checks it:
**<https://github.com/JoshSmitherman/Client_CRM/actions/workflows/ci.yml>**

- The TypeScript compiles, the linter is clean, and the app builds
- The whole database script is applied twice to a throwaway database, to prove
  a re-run is safe
- **47 security checks** run — that one client cannot see another's data, that
  internal notes never reach a client, that a client cannot approve their own
  files or change a price, that a signed-out visitor can reach nothing, and
  that the audit log cannot be edited by anyone

If any of that breaks, the tick goes red before it reaches you.

Two more run by themselves:

| Workflow | When | What it does |
|---|---|---|
| [Deploy to GitHub Pages](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/pages.yml) | Every push to `main` | Rebuilds and republishes the site |
| [Maintenance sweep](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/maintenance-sweep.yml) | 07:00 UTC daily | Moves subscriptions into "renewal due", expires lapsed ones, surfaces reminders. Needs `SUPABASE_DB_URL` from step 4 |

---

## If something goes wrong

**The app shows "Finish setting up".**
`VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` was missing when the site was
built. Check both at
**<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions>**,
then re-run
[Deploy to GitHub Pages](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/pages.yml).
These values are baked in at build time, so adding a secret does nothing until
you rebuild.

**A page reloads into "We could not find that page", or a blank screen.**
GitHub Pages does not know about the app's addresses, so it answers an unknown
one with its 404 page. This repository ships a `404.html` that hands the
address back to the app, so this should not happen — but if it does, check the
Pages source is set to **GitHub Actions** and not "Deploy from a branch"
(step 5).

**"Invite someone" fails.**
Step 7 has not been done, or the function did not deploy. Check
**<https://supabase.com/dashboard/project/_/functions>** for `invite-user`, and
the run at
[Deploy the invitation function](https://github.com/JoshSmitherman/Client_CRM/actions/workflows/deploy-function.yml).

**The seed workflow fails saying "Could not read lifecycle_stages".**
Step 4 has not finished. Go back and run the SQL script.

**A workflow fails saying a secret is not set.**
Check the names at
**<https://github.com/JoshSmitherman/Client_CRM/settings/secrets/actions>** —
they are case-sensitive and a stray space at the start or end of a pasted value
will break them. If in doubt, delete the secret and add it again.

**An invitation or reset link says it has expired.**
Either the address is not in the Redirect URLs list (step 6), or the invitation
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
