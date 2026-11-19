# Claude Retro

Live Scrum retrospectives with Claude's look and feel: Arabic and English (RTL), light and dark themes, and an animated pixel Claude mascot whose mood follows the session.

**Flow (the host controls it):** lobby → writing → reveal → voting → discussion → action plan → summary.
Participants join with just a name and a role (Scrum Team, Product Owner, Scrum Master or Viewer). The host signs in with an email magic link.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Framer Motion · Supabase (Postgres + RLS, Realtime, Auth) · Vercel

## Privacy guarantees (enforced in the database)

- While writing, nobody can read anyone else's cards. Others see only per-person counts.
- After reveal, authors stay hidden unless the host turns on "Show authors". This applies to the host too, and other people's card times are never returned.
- Votes are capped at 3 per person and stay hidden until discussion.
- Viewers can't write or vote. Anonymous users can't create retros.
- Only the host can change phases, run the timer or write the action plan.

Run `supabase/tests/rls_smoke.sql` in the Supabase SQL editor to verify this on a real database. Every line of the report should end in `ok`, and all changes roll back.

## Setup

1. Create a Supabase project and apply `supabase/migrations/*.sql` in order.
2. In Supabase, go to **Authentication → Sign In / Providers** and turn on **Allow anonymous sign-ins** and **Email**.
3. In Supabase, go to **Authentication → URL Configuration**. Set the Site URL to your production URL, and add `<url>/auth/callback` and `http://localhost:3000/auth/callback` as redirect URLs.
4. Copy `.env.example` to `.env.local` and fill it in.

```bash
npm install
npm run dev
```

### Restricting who can host

Add allowed email domains to the `public.host_domains` table (SQL editor):

```sql
insert into public.host_domains (domain) values ('yourcompany.com');
```

An empty table means anyone can host. You can also set `ALLOWED_HOST_EMAIL_DOMAINS=yourcompany.com` so the login page shows a friendly message, but the database table is what actually enforces it.

### Email

Supabase's built-in email sender has very low rate limits. For a real team, configure custom SMTP under **Authentication → Emails → SMTP**. If hosts open the magic link on a different device than the one they requested it from, change the Magic Link template to use `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`.

## Tests

```bash
npm test            # unit + component tests (vitest)
npm run test:int    # RLS integration tests (needs SUPABASE_SERVICE_ROLE_KEY in .env.local)
```

Dev-only previews (not served in production): `/dev/mascot` and `/dev/board`.

## Deploy

Push to GitHub and import the repo into Vercel. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and, optionally, `ALLOWED_HOST_EMAIL_DOMAINS`. Never add the service role key to Vercel.

---

The pixel mascot is a fan recreation of Claude Code's character. Claude is a trademark of Anthropic. Fine for internal team use; review it before any public or commercial use.
