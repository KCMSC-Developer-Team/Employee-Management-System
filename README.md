# K C Model School & College — Employee Management System

Next.js 15 (App Router, TypeScript) · Neon PostgreSQL · Resend e-mail · Web Push · deploy on Vercel.
Colours and emblem come from the school's *Website Colour Palette & Digital Brand Guide*.

> **Status:** the code was written and syntax-checked, and the routine clash logic was tested, but it was
> **not compiled or run against a real database** (the build environment had no access to the npm registry).
> Expect to fix a small typo or two on first deploy — see "First deploy checklist" below.

---

## 1. What you need (all have free tiers)

| Service | Used for | Where to get the values |
|---|---|---|
| **Neon** | PostgreSQL database | neon.tech → create project → *Connect* → copy the **pooled** connection string → `DATABASE_URL` |
| **Resend** | password, invite and notification e-mails | resend.com → verify your domain → create API key → `RESEND_API_KEY`; sender → `EMAIL_FROM` |
| **Vercel** | hosting | vercel.com → import this project |

## 2. Deploy on Vercel (about 10 minutes)

1. Unzip, push the folder to a new GitHub repository (or use `vercel` CLI).
2. In Vercel, **Add New → Project**, pick the repository. Framework is detected as Next.js.
3. Open **Settings → Environment Variables** and add everything from `.env.example`:
   - `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 48`), `APP_URL` (your Vercel URL, no trailing slash)
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — generate once with `npm install && npm run vapid`
   - `CRON_SECRET`
4. **Deploy.** The build runs `scripts/migrate.mjs` first: it creates the tables and the default period columns.
   It is safe to run on every deploy.
5. **Create the first Developer:** open `https://YOUR-SITE/setup` and press the button. A link to choose a password is
   e-mailed to **zarif@kcmsc.edu.bd** (built in; override with `DEVELOPER_EMAIL`). Any account created with that
   e-mail is a Developer automatically. No seeding, no passwords in environment variables.

### Run locally
```bash
npm install
cp .env.example .env.local     # fill it in
npm run migrate
npm run dev                    # http://localhost:3000
```

### Class reminders (needs one extra step)
Mentors get a notification ~10 minutes before each class. Something must call the reminder URL every 5 minutes:

```
https://YOUR-SITE/api/cron/reminders?key=YOUR_CRON_SECRET
```
Vercel's free (Hobby) plan only allows daily cron jobs, so use a free pinger such as **cron-job.org**:
create a job, paste the URL, schedule *every 5 minutes*, Sat–Thu, school hours. (On a Vercel Pro plan you can add a
`crons` entry to `vercel.json` instead — Vercel then sends `Authorization: Bearer $CRON_SECRET` automatically.)
Each mentor is reminded once per class per day.

---

## 3. How it maps to your brief

| Requirement | Where |
|---|---|
| People see **designation**, never roles; one person can hold several roles | roles are hidden columns; the header shows designation. Roles appear only on the IT/Developer "Account and access" card |
| **Developer** — everything | `can()` in `src/lib/roles.ts` gives Developer every permission; only a Developer can delete accounts or grant Developer / IT Technician |
| **IT Technician** — create accounts, assign Authority / Routine Coordinator / Mentor, never Developer | `/employees/new`; enforced again on the server (`cleanRoles`) |
| **Bulk import with preview of which header goes where** | `/employees/import` — file → column matching (auto-guessed, editable) → preview with a "→ imported as" label above every column → problem rows skipped |
| **Authority** — sees full list, adds private objections, prints one or all profiles | `/employees`, `/employees/[id]`, `/employees/print` |
| Objection visible only to that employee (and Developer) | `/objections`; the employee page shows them only to Developer, and to the Authority who wrote them |
| **Routine Coordinator** — mentors vertical, periods horizontal, Junior / Senior | `/routine` (day tabs, section switch, editable period names/times at `/routine/periods`) |
| Smart editor warns about doubles / overlaps | `src/lib/routine.ts` — same class booked twice at overlapping times, and a mentor in two places at once (also across sections) |
| Routine changes pushed as notifications | every mentor whose row changed is notified on save |
| **Mentor** — own profile, edits need approval | `/profile` → `/approvals` (Developer / IT Technician / Authority; nobody approves their own) |
| Mentor's routine auto-calculated, form class shown, next-class reminder, other mentors' contacts | `/my-routine`, dashboard card, `/api/cron/reminders`, `/directory` |
| Profile Sheet fields | every field of the PDF in `src/lib/profile-fields.ts` |
| Photo upload with crop | `PhotoUploader` — drag + zoom, saves a 400×400 JPEG |
| Password reset at login and in settings | `/forgot`, `/reset`, **Settings** |
| Notification centre + bell | `/notifications`; unread count on the bell |
| Browser **and** e-mail, can switch off one but never both | **Settings**; also enforced by a database constraint |
| Dedicated **i** panel with directions | round **i** button on every page (`src/lib/help.ts`) |
| Palette | CSS variables in `src/app/globals.css` are the palette's own tokens |
| Resend · Neon · Vercel | `src/lib/mail.ts` · `src/lib/db.ts` · deploy steps above |

## 4. Decisions I made where the brief was silent — change if you disagree

- **Who sees the full profile sheet:** Authority and Developer. An IT Technician sees name, designation, e-mail and
  mobile, and can see the *changed fields* when approving an edit — but not the full sheet (NID, addresses…).
- **Administration-only fields:** ID No., Date of joining, Position, Supervisor and the four Observation rows are
  edited by Developer / IT Technician / Authority, not by the employee.
- **Developer's own profile edits** save directly (nobody senior to approve them).
- **Profile photo** changes apply immediately; only the written details wait for approval.
- **Authority can read the objections they wrote** (so they can see what they recorded); other Authorities cannot.
- **Objection e-mails/pushes** contain only the subject, not the full text.
- **School week:** Saturday–Thursday tabs (Friday off). Default periods: Form Class, Periods 1–3, Tiffin Hour,
  Periods 4–6 with **placeholder times** — set the real ones in *Routine editor → Edit periods and times*.
- **Routine warnings don't block saving** (the coordinator decides), but the button says "Save with N warning(s)".
- Employees can sign in with their e-mail or ID number. Their initial password is their ID number; they can change it in Settings. E-mail is optional for employee accounts.
- Photos are stored in the database (small cropped JPEGs), so no extra file-storage service is needed.

## 5. Something not working? Open `/api/health`

`https://YOUR-SITE/api/health` shows, without revealing any secret: which environment variables are set
(`APP_URL` and `EMAIL_FROM` are shown in full), whether each database table exists, and whether the Developer
account exists and has a password. Most problems are visible there — a wrong `APP_URL` means e-mail links point at
the wrong site; a missing `AUTH_SECRET` means sign-in fails.
After changing any environment variable in Vercel you must **Redeploy** for it to take effect.

## 6. First deploy checklist

- [ ] Build log shows `[migrate] done`; `/setup` e-mails you the password link
- [ ] You can sign in; **Settings → Enable on this browser** works (needs HTTPS and the VAPID keys)
- [ ] Add a test employee → invitation e-mail arrives (Resend domain verified, `EMAIL_FROM` on that domain)
- [ ] Add two Mentors → open **Routine editor**, type the same class for both in one period → red warning appears
- [ ] `next.config.mjs` currently sets `ignoreBuildErrors: true` so a stray type error cannot block your first
      deploy. Once everything works, set it to `false` and run `npx tsc --noEmit` to clean up any type warnings.

## 7. Project layout

```
db/schema.sql          database tables (idempotent)
scripts/migrate.mjs    runs before every build: schema + default period columns
src/lib/               roles, auth, db, mail, notify, routine logic, profile fields, help text
src/actions/           server actions (auth, users, profile, routine, misc)
src/components/        form wrapper, info panel, photo cropper, import wizard, routine grid …
src/app/(auth)/        sign-in, forgot, reset
src/app/(app)/         dashboard, profile, routines, directory, employees, approvals, settings …
src/app/api/           photo, push subscribe, class-reminder cron
public/                logo.png (from the colour guide), sw.js (push service worker)
```
