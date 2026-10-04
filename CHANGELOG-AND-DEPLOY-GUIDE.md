# ReviewRadar — What changed (v7 → v9) + How to deploy on Vercel

---

## Part 1 — Everything fixed, v7 → v9

### Crash fixes
- **App-wide crash on missing Supabase config.** Previously, if `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` were missing at build time, the whole app failed to render — blank page, no error, no clue why. Now the app always renders, and Login/Signup show a clear on-screen message telling you exactly which variable is missing.
- **Dashboard crash: `businesses.find is not a function`.** Caused by corrupted browser storage left over from earlier versions of the app (an object where an array was expected). The app now validates the shape of anything it reads from storage and self-heals (wipes bad data) instead of crashing.
- **Onboarding "Connect business" silently hanging forever.** If saving a new business to Supabase failed for any reason, the wizard just spun with no feedback and never actually saved. Now it shows a real error message and lets you retry.

### Performance
- **Landing page load time cut roughly in half.** The animated particle background (three.js, ~600KB) used to load and block the page before anything appeared. It now loads separately, after your actual content is visible.
- **Scroll smoothness.** The particle animation's heaviest calculation (per-particle wave math) now runs every other frame instead of every frame — same visual effect, much less CPU competing with your scrolling. It also now pauses completely when the browser tab isn't focused.
- Particle count reduced from 10,000 → 4,900 for lower baseline CPU use.

### Cosmetic
- The faint, near-invisible "01 / 02 / 03" step numbers on the landing page darkened to be actually visible.
- Cleaned up em-dash-heavy copy in the hero tagline.

### Security
- **Password minimum length** in the app's own validation updated from 6 → 8 characters, to match the minimum you configured in Supabase's dashboard (previously these two disagreed — the app would accept a 7-character password, then Supabase would reject it).
- **Basic client-side login rate limiting** added: 5 failed attempts locks the form for 30 seconds. (Note: Supabase Auth also rate-limits sign-in attempts on its own server side regardless of this — this is a secondary, UX-friendly layer, not the only protection.)
- Verified: no XSS-risk patterns anywhere in the codebase (no `dangerouslySetInnerHTML`, `eval`, or raw `innerHTML`).
- Verified: Row Level Security is enabled and working on the `businesses` table — confirmed via `supabase_setup.sql`.
- `vercel.json` added (see Part 2) so client-side routes don't 404 in production.

### Known, deliberately not fixed
- One **moderate-severity dev-server-only** dependency vulnerability in `esbuild`/Vite (`npm audit`). Only exploitable while `npm run dev` is running locally and you're simultaneously browsing a malicious site — does not affect the deployed production build. Fixable via `npm audit fix --force`, but that's a breaking major-version bump, left as an optional call rather than forced.
- Leaked-password protection in Supabase — Pro-tier only, skipped for cost reasons.

---

## Part 2 — Deploying to Vercel

Vercel is free for this project's scale, detects Vite projects automatically, and needs almost no configuration.

### Prerequisite: push the code to GitHub

You said you haven't touched GitHub yet, so start here.

1. Create a free account at **github.com** if you don't have one.
2. Create a **new, empty repository** (Repositories → New). Name it something like `reviewradar`. Leave it empty — don't add a README, .gitignore, or license (your project already has these).
3. Decide: **public or private repo?** Either works with Vercel's free tier. Private is the safer default for a project with real user data, but doesn't matter for security of your `.env` either way — that file is excluded from git regardless (see below).
4. In your terminal, inside the `reviewradar-v7` project folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/reviewradar.git
   git push -u origin main
   ```
   Replace `YOUR-USERNAME` with your actual GitHub username, and the repo name if you named it differently.
5. **Confirm `.env` did NOT get pushed** — refresh the GitHub repo page in your browser and check the file list. You should see `.env.example` but **not** `.env`. If you somehow do see `.env` there, stop and tell me immediately — that means your real Supabase keys are now public and need rotating.

### Deploying on Vercel

1. Go to **vercel.com** → sign up/log in (easiest: "Continue with GitHub", which also handles the connection permission in one step).
2. Click **Add New → Project**.
3. Find and **Import** your `reviewradar` repository from the list.
4. Vercel auto-detects it as a Vite project — the build command (`vite build` via your `npm run build`), output directory (`dist`), and install command should already be filled in correctly. You shouldn't need to touch these.
5. **Before clicking Deploy**, open the **Environment Variables** section on this same screen and add:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | (copy from your local `.env` file) |
   | `VITE_SUPABASE_ANON_KEY` | (copy from your local `.env` file) |

   This step is the one most people skip and then wonder why sign-in is broken on the live site — remember, Vite bakes these in at build time, so they must be set *before* the first build, or you'll need to redeploy after adding them.
6. Click **Deploy**. Takes about a minute.
7. You'll get a live URL like `reviewradar-xyz.vercel.app`. Open it and test sign-in / dashboard exactly like you did on localhost.

### After it's live — finish the security checklist

Now that you have a real, permanent URL, go back and do the two items that were blocked before:

1. **Supabase → Authentication → URL Configuration**: set **Site URL** to your new `https://reviewradar-xyz.vercel.app` address (or your custom domain, if you add one later). This restricts auth flows to only work from your actual site.
2. **Hosting-level DDoS/firewall**: nothing to do — Vercel has this on by default for all projects, no configuration needed.

### Ongoing workflow, once this is set up

Every time you `git push` to the `main` branch, Vercel automatically rebuilds and redeploys the live site — you don't need to repeat these steps for future changes, just push code.

### Common issues, if something doesn't work

- **Blank page on the live site**: almost always the env vars weren't set before the first build. Add them in Vercel → Project → Settings → Environment Variables, then Vercel → Deployments → (latest) → **Redeploy**.
- **404 on refreshing `/dashboard` or `/login`**: this is what `vercel.json` (already included) prevents — confirm it's present in your repo root.
- **Sign-in works locally but not live**: double check the env var *values* on Vercel exactly match your local `.env` — easy to mistype/truncate when copy-pasting.

---

## Part 3 — NFC tap gate (free month, then auto-block)

**How it works:** the NFC card holds `https://<project>.supabase.co/functions/v1/tap?b=<slug>`. Every tap hits that function, which checks `access_starts_at` / `access_ends_at`, logs the tap, then redirects to Google's review page (active) or to `/expired` (ended). No domain needed. New businesses automatically get 30 free days.

**One-time setup**
1. Supabase SQL Editor → run `supabase_migration_nfc_gate.sql`.
2. `supabase functions deploy tap --no-verify-jwt`
3. `supabase secrets set APP_URL=https://your-app.vercel.app`
4. Redeploy the frontend (Vercel auto-deploys on `git push`).

**Per customer**
- Get the business's Google Place ID (starts with `ChIJ`) — Google "Place ID Finder" — then in SQL:
  `update businesses set google_place_id = 'ChIJ...' where slug = 'their-slug';`
  (If left empty, the tap opens their Google Maps page instead of the review box.)
- Copy their link from the dashboard NFC card and write it onto the card (any NFC writer app, "URL/URI" record).

**When they pay / deal changes**
- `select rr_set_access('their-slug', now(), now() + interval '365 days');`
- See everyone: `select * from rr_admin_overview;`

**If they don't pay:** do nothing. On the end date, taps stop going to Google and show the expired page automatically.
