# Where to host this

The application is a static site — HTML, JavaScript and CSS — that talks
directly to Supabase. Anywhere that serves files will run it, GitHub Pages
included, which is what
[docs/GITHUB-SETUP.md](GITHUB-SETUP.md) walks through.

This page explains why that is safe, what the one exception is, and what to do
if you would rather host it somewhere else.

---

## Why a static site is not a weaker one

The rule for this project was that permissions must never rely on frontend
checks alone. They do not, and never did: the checks that matter are in
Postgres.

Every table has Row Level Security enabled **and forced**, with about 104
policies deciding which rows each signed-in person may read or write, plus
column guards and state-transition guards as triggers. Those run inside the
database, on every statement, no matter what sent it — this app, `curl`, or the
Supabase dashboard. Removing the server did not move a single one of them.

The key compiled into the page is the **anon key**. It identifies the project
and nothing else; on its own it can read nothing, because every policy is
written against `auth.uid()` and a signed-out visitor has none. Supabase
publishes it on purpose for exactly this reason.

There is a test for this. `scripts/rls-tests.sql` contains 47 assertions run on
every push, including what an anonymous caller can reach (nothing) and what a
signed-in client can reach (their own organisation, and not one column more).
It is worth knowing that these caught a real bug: agency-only notes were stored
as columns on rows clients could read, and Row Level Security restricts rows,
not columns — so those notes were readable straight from the API even though no
screen ever showed them. They now live in a table with no client policy at all.

## The one exception

Creating a login needs the **service role key**, which bypasses every policy.
That must never be in a web page, so it is not: the one operation that needs it
runs as a Supabase Edge Function, `supabase/functions/invite-user`.

The function does not simply hold the key and do as it is told. It:

1. verifies the caller's JWT and loads their profile,
2. refuses an inactive account,
3. checks in the database who may invite whom — an administrator may invite
   anyone; a client administrator may invite only client roles, only into their
   own organisation,
4. resolves which organisation the invitee joins **as the caller**, so it cannot
   be steered by what was posted,
5. writes the invitation and sends the email, rolling the row back if the send
   fails,
6. records the audit entry as the caller, so the log names the right person.

Deploying it is step 7 of the setup guide, and is a GitHub Action — nothing to
install.

---

## GitHub Pages

Covered step by step in [docs/GITHUB-SETUP.md](GITHUB-SETUP.md). In short:

- **Settings → Pages → Source** must be **GitHub Actions**
- Two repository secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `.github/workflows/pages.yml` builds and publishes on every push

Two details it handles for you:

**The sub-path.** A repository site is served from `/<repo>/`, so the build is
given `BASE_PATH` and every asset and route is written with that prefix. For a
user or organisation site served from the domain root, the same workflow
produces `/` instead, with no change.

**Deep links.** GitHub Pages looks for a file at the address you asked for, so
`/clients/abc` would be a 404. `public/404.html` catches that, records where
you were going, and hands it to the router, which restores the address before
the first paint. Refreshing a page and pasting a link both work.

---

## Somewhere else

Any static host will do, and the build is identical:

```
npm ci
npm run build          # writes dist/
```

| Host | Notes |
|---|---|
| **Cloudflare Pages** | Build `npm run build`, output `dist`. Set a custom domain free |
| **Netlify** | Same. Add a `/* -> /index.html 200` rewrite and you can drop `404.html` |
| **Vercel** | Same. Free plan is non-commercial; check their current terms |
| **Your own server** | Copy `dist/` behind nginx. Rewrite unknown paths to `index.html` |

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time environment
variables. They are read when the bundle is built, not when it is served, so
**changing them needs a rebuild** — a redeploy alone will not pick them up.

Leave `BASE_PATH` unset unless the site is served from a sub-path.

---

## The scheduled sweep

One job has to run whether or not anyone is looking: moving subscriptions into
"renewal due" as their date approaches, expiring lapsed ones that do not
auto-renew, and surfacing reminders that have reached their notification
offset.

All of it is one Postgres function, `public.sweep_maintenance_state()`, and it
is idempotent. Two things call it:

- The Maintenance screen, whenever an agency user opens it
- `.github/workflows/maintenance-sweep.yml`, at 07:00 UTC daily, using the
  `SUPABASE_DB_URL` secret

If you host elsewhere and would rather not use GitHub Actions, point any cron
at the same function, or use Supabase's own
[scheduled jobs](https://supabase.com/dashboard/project/_/integrations/cron).

---

## Whichever you pick

Two settings, or sign-in will silently fail:

- **Site URL** in Supabase must be your real address
- That address, with `/**` on the end, must be in the
  [redirect allow-list](https://supabase.com/dashboard/project/_/auth/url-configuration)

Invitation and password-reset links are built from the address the app is
served at, so both have to match where people actually visit.
