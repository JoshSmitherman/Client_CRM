# Where to host this

**Short version: GitHub Pages cannot run this application.** It is not a
configuration problem — it is a category difference, explained below. Anything
that runs Node.js will work, and the setup is about as easy.

---

## Why not GitHub Pages

GitHub Pages serves static files. It has no server: no Node process, nothing
that executes when someone visits a page.

This application needs a server on every request:

| What it needs a server for | Where |
|---|---|
| Server Actions — every form submission | 17 files |
| Session refresh and route guards | `src/middleware.ts` |
| Secure file downloads | `src/app/api/files/[id]/route.ts` |
| The scheduled reminder sweep | `src/app/api/reminders/sweep/route.ts` |
| Rendering each page as the signed-in user | 5 route groups marked `force-dynamic` |

The blocker is not merely that these would stop working. It is this:

> **Creating client logins requires the Supabase service role key**, and that
> key bypasses Row Level Security completely.
>
> On a static host there is nowhere to keep it but the browser bundle. Anyone
> who opened developer tools would have full read and write access to every
> client's data — every project, file, message and invoice line — regardless of
> any permission the application appears to enforce.

So the two things asked for together — hosting on GitHub Pages, and staff
creating client logins from inside the platform — cannot both be true. Keeping
a server is what makes the second one safe.

The same reasoning rules out rewriting this as a static single-page app: the
brief for this project was that permissions must never rely on frontend checks
alone, and a static build has nothing else to rely on.

---

## What to use instead

Any host that runs Node.js. Three that keep the same "push to GitHub and it
deploys" workflow:

### Vercel — the least work

Made by the Next.js team; this app needs no configuration at all.

1. Go to **<https://vercel.com/new>** and sign in with GitHub
2. Find **Client_CRM**, click **Import**
3. Add four environment variables:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your `anon` `public` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your `service_role` `secret` key |
   | `REMINDER_SWEEP_SECRET` | Any long random string you invent |

4. Click **Deploy**
5. When it finishes, copy your address, then add it back as
   `NEXT_PUBLIC_SITE_URL` in **Settings → Environment Variables** and redeploy
6. Add `https://your-address.vercel.app/auth/callback` to the Supabase
   [redirect URLs](https://supabase.com/dashboard/project/_/auth/url-configuration)

`vercel.json` already schedules the daily reminder sweep.

> **One thing to check before you commit to it.** Vercel's free Hobby plan is
> intended for non-commercial use. A tool you run your agency on is commercial,
> so you would need a paid plan. Read their current terms at
> <https://vercel.com/docs/limits/fair-use-guidelines> and decide — the two
> options below have no such restriction.

### Netlify — free tier allows commercial use

1. Go to **<https://app.netlify.com/start>** and pick the repository
2. Netlify detects Next.js; `netlify.toml` in this repo sets the rest
3. Add the same four environment variables under
   **Site configuration → Environment variables**
4. Deploy, then add `https://your-site.netlify.app/auth/callback` to the
   Supabase redirect URLs

For the daily sweep, add a Scheduled Function, or point any cron service at
`POST /api/reminders/sweep` with the header
`Authorization: Bearer <REMINDER_SWEEP_SECRET>`.

### Cloudflare Workers — free, generous, a little more setup

Needs the `@opennextjs/cloudflare` adapter. Cheapest at scale and no
commercial-use restriction, but expect to spend an hour on it rather than five
minutes: <https://opennext.js.org/cloudflare>

### Anywhere else

`npm run build && npm start` runs it on any Node 20+ host — a VPS, Railway,
Render, Fly.io, or your own server behind nginx. Set the same four environment
variables and point a cron at the sweep endpoint.

---

## If you specifically want a github.com address

Point a custom domain at whichever host you choose. GitHub Pages can also serve
a small static landing page on `username.github.io` with a link through to the
portal, if a github.io address matters for another reason — but the portal
itself has to live somewhere that runs Node.

---

## Whichever you pick

Remember these two, or sign-in will silently fail:

- `NEXT_PUBLIC_SITE_URL` must be your real address, because invitation and
  password-reset links are built from it
- That address must be in Supabase's
  [redirect allow-list](https://supabase.com/dashboard/project/_/auth/url-configuration),
  and so must the Site URL
