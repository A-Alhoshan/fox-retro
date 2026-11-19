# Claude Retro: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live, multi-device Scrum Retrospective tool with Claude's look, light and dark themes, Arabic and English, and an animated pixel Claude mascot, deployed from scratch to GitHub, Vercel and Supabase.

**Architecture:** One Next.js App Router app. Supabase stores the data (Postgres with RLS), handles auth (magic link for the host, anonymous sign-in for participants) and pushes live updates (Realtime: postgres_changes, broadcast and presence on one channel per retro). Private data, meaning other people's cards during writing, authors while hidden, and vote totals before discussion, is read only through `SECURITY DEFINER` RPCs that strip it. Host-only operations are Server Actions. Pure domain logic (timer, votes, phases, mood, export, validation) lives in `src/lib/domain` and is unit-tested.

**Tech Stack:** Next.js (latest stable, App Router, TypeScript), Tailwind CSS, shadcn/ui, Framer Motion, next-themes, `@supabase/supabase-js` + `@supabase/ssr`, Vitest + Testing Library, GitHub (`gh`), Vercel CLI, Supabase MCP tools.

**Spec:** `docs/superpowers/specs/2026-11-19-retro-tool-design.md`

## Global Constraints

- Roles: `team` (Scrum Team), `product_owner` (Product Owner), `scrum_master` (Scrum Master), `viewer` (Viewer). Team, PO and a joining Scrum Master have identical rights (write and vote). Viewer is read-only. Only the creator (`host_user_id`) controls the session.
- Phases, in order: `lobby → writing → reveal → voting → discussion → action_plan → summary`. Only the host changes the phase. The timer running out never advances it.
- Columns: `went_well` (EN "What went well" / AR «وش مشى زين»), `to_improve` ("What to improve" / «وش يحتاج تحسين»), `ideas` ("Ideas" / «أفكار»).
- Votes: 3 per participant, and stacking on one card is allowed. Votes are hidden until the phase reaches `discussion`.
- Cards are hidden from others during `writing`. Authors are hidden after reveal unless `show_authors`, and that holds for the host too, enforced in the database.
- Colors: primary `#D97757`. Light background `#FAF9F5`. Dark background `#1F1E1D`.
- Fonts: Fraunces for headings, Inter for English text, IBM Plex Sans Arabic for Arabic (all via `next/font/google`).
- Animations under 400ms. Every animation respects `prefers-reduced-motion`.
- UI is Arabic and English. Locale is chosen by the user, persisted per device, and defaults to the browser language. Arabic is fully RTL; use logical properties only (`ms-/me-/ps-/pe-/start-/end-`), never `ml-/mr-/left-/right-`. Card text uses `dir="auto"`.
- The mascot is the Claude Code pixel character, drawn as SVG `rect` pixels with `shape-rendering: crispEdges` and animated frame by frame with `steps()`. It is isolated in `src/components/mascot/`.
- Optional env var `ALLOWED_HOST_EMAIL_DOMAINS` (comma-separated). If it is empty, any email can host.
- Card text: 1 to 500 characters after trim. Participant name: 1 to 40 characters after trim.

## Review Focus

1. **Device clock skew:** two devices with clocks 40s apart must show the same remaining time. The client computes a server clock offset (`server_now()` RPC). Pinned by a test in Task 3.
2. **Refresh or reopening the tab:** the participant must come back as the same person with the same cards and votes, without a duplicate entry in the list. `join_retro` is idempotent per `auth.uid()`. Pinned by an integration test in Task 2.
3. **Joining late:** joining during writing, voting or discussion must work, with no crash on missing state. Pinned by an integration test in Task 2.
4. **Bad input:** empty or whitespace-only names and cards are rejected, a 501-character card is rejected, and duplicate names are allowed. Pinned by tests in Task 3.
5. **Host on a second device or after a refresh:** the host signs in again and gets control back, and an anonymous participant can never call host actions. Pinned by an integration test in Task 2 and a Server Action test in Task 6.

---

## File Structure

```
supabase/migrations/0001_init.sql        schema, RLS, RPCs, triggers
src/lib/domain/types.ts                  Phase, Role, Column, Mood, row types
src/lib/domain/phases.ts                 phase order helpers
src/lib/domain/timer.ts                  timer math
src/lib/domain/votes.ts                  vote rules
src/lib/domain/validate.ts               name/card/email validation, code generator
src/lib/domain/mood.ts                   mascot mood from session state
src/lib/domain/markdown.ts               summary → Markdown
src/lib/supabase/{client,server}.ts      supabase clients (browser / server)
src/i18n/{en,ar}.ts, src/i18n/locale.tsx  messages + LocaleProvider/useT
src/components/theme/*                   ThemeProvider, ThemeToggle
src/components/mascot/{sprites.ts,Mascot.tsx}
src/components/retro/*                   session UI pieces
src/app/(pages)                          /, /login, /dashboard, /r/[code], /r/[code]/summary
src/app/r/[code]/host-actions.ts         host Server Actions
src/app/actions.ts                       createRetro
tests/unit/**, tests/integration/**
```

---

### Task 1: Scaffold, theme, fonts and i18n shell

**Files:**
- Create: the app via `create-next-app`, `src/components/theme/ThemeProvider.tsx`, `src/components/theme/ThemeToggle.tsx`, `src/i18n/en.ts`, `src/i18n/ar.ts`, `src/i18n/locale.tsx`, `src/components/LocaleToggle.tsx`, `vitest.config.ts`
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Test: `tests/unit/i18n.test.tsx`

**Interfaces:**
- Produces: `type Locale = 'en' | 'ar'`, `messages: Record<Locale, Messages>` (where `Messages` is the type of `en`, and `ar` must satisfy it), `LocaleProvider`, `useT(): { t: (key: MessageKey, vars?: Record<string,string|number>) => string; locale: Locale; dir: 'ltr'|'rtl'; setLocale(l: Locale): void }`, `detectLocale(acceptLanguage: string | null): Locale`. CSS tokens `--primary`, `--bg`, `--fg`, `--card`, `--muted`, `--border` for light and dark. Tailwind maps them.

- [ ] **Step 1:** Run `npx create-next-app@latest claude-retro --ts --tailwind --eslint --app --src-dir --import-alias "@/*"` and move it to the repo root. Then run `git init`, `npx shadcn@latest init`, and install `framer-motion next-themes @supabase/supabase-js @supabase/ssr vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`. Add the script `"test": "vitest run"`.
- [ ] **Step 2: Write the failing test** `tests/unit/i18n.test.tsx`:
  - `detectLocale('ar-SA,ar;q=0.9,en;q=0.8') === 'ar'`, `detectLocale('en-US') === 'en'`, `detectLocale(null) === 'en'`
  - every key in `en` exists in `ar` and vice versa (deep key comparison)
  - rendering `<LocaleProvider initial="ar">` sets `document.documentElement.dir === 'rtl'` and `lang === 'ar'`; `setLocale('en')` flips it to `ltr`/`en` and writes `localStorage['locale'] === 'en'`
  - `t('vote.remaining', { n: 2 })` interpolates `{n}`
- [ ] **Step 3:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 4:** Implement the i18n files. Messages cover all UI copy, including the column names above, the role names (AR: «فريق سكرم», «مالك المنتج», «سكرم ماستر», «مشاهد»), the phase names and the `vote.remaining` key. In `layout.tsx`, read the `locale` cookie, else `Accept-Language` through `detectLocale`, and set `<html lang dir>` on the server so there's no flash. `setLocale` also writes the cookie. Load the fonts with `next/font`; use the Arabic font when `dir=rtl`. Theme: `next-themes` with `attribute="class"` and `defaultTheme="system"`. ThemeToggle animates a sun/moon swap. Add `transition: background-color .3s, color .3s` on body.
- [ ] **Step 5:** Run `npm test`. Expected: PASS. Run `npm run build`. Expected: success.
- [ ] **Step 6: Commit** with the message `feat: scaffold app with theme and AR/EN i18n`.

### Task 2: Supabase project, schema, RLS and RPCs

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `.env.local` (gitignored), `.env.example`, `tests/integration/helpers.ts`, `tests/integration/rls.test.ts`

**Interfaces:**
- Produces, as tables: `retros(id uuid pk, code text unique, title text, host_user_id uuid, phase phase default 'lobby', timer_ends_at timestamptz null, timer_remaining_ms int null, phase_durations jsonb default '{}', show_authors bool default false, focused_card_id uuid null, created_at)`, `participants(id, retro_id, user_id, name, role, created_at, unique(retro_id,user_id))`, `cards(id, retro_id, author_participant_id, "column" retro_column, text, created_at)`, `votes(id, card_id, participant_id, retro_id)`, `action_items(id, retro_id, text, owner_text, owner_participant_id null, due_date date null, position int)`, `action_item_refs(action_item_id, card_id, pk both)`. Enums: `phase`, `retro_role`, `retro_column`.
- Produces, as RPCs (all callable by `authenticated`):
  - `server_now() returns timestamptz`
  - `get_retro_by_code(p_code text) returns table(id uuid, title text, phase phase)`, which works for non-members (needed for join)
  - `join_retro(p_code text, p_name text, p_role retro_role) returns uuid`, which upserts on `(retro_id, auth.uid())`, updates name/role on rejoin, and returns the participant id
  - `get_cards(p_retro uuid) returns table(id, "column", text, created_at, author_participant_id uuid null, is_mine bool)`. While `phase='writing'` (or `lobby`) it returns only the caller's cards. Otherwise it returns all cards, with `author_participant_id` null unless `show_authors` or the card is the caller's.
  - `get_card_counts(p_retro uuid) returns table(participant_id uuid, n int)`
  - `get_vote_totals(p_retro uuid) returns table(card_id uuid, n int)`, which returns empty unless the phase rank is ≥ `discussion`
- Produces: `createBrowserClient()` in `client.ts`, `createServerClient()` in `server.ts` (cookie-based, per `@supabase/ssr` docs).
- RLS rules: `is_member(retro)` and `is_host(retro)` are SQL helpers.
  - `retros`: select if member or host; insert if `host_user_id = auth.uid()` and the user is not anonymous; update if host.
  - `participants`: select if member or host; insert and update go only through `join_retro`.
  - `cards`: select own only; insert own if non-viewer, the participant belongs to `auth.uid()`, and the phase is `writing`; update/delete own while `writing`.
  - `votes`: select own only; insert/delete own while `voting` and non-viewer. A trigger rejects the insert when the participant already has 3 votes in that retro.
  - `action_items` and `action_item_refs`: select if member or host; write if host.
  - Add `retros`, `participants`, `action_items` and `action_item_refs` to the `supabase_realtime` publication.

- [ ] **Step 1: Ask the user to approve creating the Supabase project** (show the cost from `get_cost`/`confirm_cost`). Then call `create_project` (name `claude-retro`, nearest region). Fetch the URL and publishable key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Enable Anonymous sign-ins and email magic link in Auth settings. If the tools can't set this, give the user the exact dashboard toggle and wait.
- [ ] **Step 2: Write the failing integration tests** in `tests/integration/rls.test.ts`. Use two anonymous clients (A and B) and one host client. The host is a non-anonymous user created with the service role key in the helper, read from `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and never shipped to the client. Cases:
  - `writing: B cannot see A's card via get_cards nor select from cards`
  - `writing: get_card_counts shows A has 1`
  - `reveal with show_authors=false: author_participant_id is null for B and for the host`
  - `viewer cannot insert a card or a vote`
  - `4th vote is rejected; 3 votes on the same card succeed`
  - `get_vote_totals is empty during voting and returns totals in discussion`
  - `anon participant cannot update retros.phase`
  - `join_retro twice from the same user returns same id and participants count stays 1` (Review Focus 2)
  - `join_retro succeeds when phase is voting` (Review Focus 3)
  - `host signed in on a second client can update phase` (Review Focus 5)
- [ ] **Step 3:** Run `npx vitest run tests/integration`. Expected: FAIL (relations missing).
- [ ] **Step 4:** Write `0001_init.sql` to satisfy the tests, and apply it with `apply_migration`.
- [ ] **Step 5:** Run `npx vitest run tests/integration`. Expected: PASS. Run `get_advisors` (security). Expected: no RLS-disabled tables.
- [ ] **Step 6: Commit** with the message `feat: supabase schema, RLS and RPCs`.

### Task 3: Domain logic

**Files:**
- Create: `src/lib/domain/{types,phases,timer,votes,validate,mood,markdown}.ts`
- Test: `tests/unit/domain/*.test.ts` (one file per module)

**Interfaces:**
- `types.ts`: `Phase`, `Role`, `Column` (string unions matching the SQL enums), `RetroRow`, `ParticipantRow`, `VoteRow` (mirroring the Task 2 tables, camelCase is not used: keep the snake_case column names), `CardView` (the `get_cards` row), `ActionItemView = action_items row & { cardIds: string[] }`
- `PHASES: readonly Phase[]`; `phaseRank(p: Phase): number`; `nextPhase(p): Phase | null`; `prevPhase(p): Phase | null`
- `type TimerState = { endsAt: string | null; remainingMs: number | null }`; `remainingMs(t: TimerState, nowMs: number): number`; `isRunning(t): boolean`; `clockOffset(serverNowIso: string, clientSentMs: number, clientRecvMs: number): number` (= server − midpoint of sent/recv)
- `MAX_VOTES = 3`; `votesLeft(myVotes: number): number`; `canVote(role: Role, phase: Phase, myVotes: number): boolean`
- `validateName(s): { ok: true; value: string } | { ok: false; error: 'empty' | 'too_long' }` and `validateCard(s)` with the same shape (limits from Global Constraints); `isHostEmailAllowed(email: string, allowed: string | undefined): boolean`; `generateCode(rand: () => number = Math.random): string`, which returns 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
- `type Mood = 'happy' | 'wave' | 'jump' | 'focused' | 'nervous' | 'surprised' | 'excited' | 'sad' | 'celebrate'`; `moodFor(s: { phase: Phase; remainingMs: number; timerRunning: boolean; timerStarted: boolean; focusedColumn: Column | null }): Mood`
- `toMarkdown(s: SummaryData, t: (k: MessageKey) => string): string`, where `SummaryData = { title: string; date: string; cards: { column: Column; text: string; votes: number }[]; actions: { text: string; owner: string; dueDate: string | null; refs: string[] }[] }`

- [ ] **Step 1: Write the failing tests:**
  - timer: `remainingMs({endsAt: T+90s, remainingMs:null}, T) === 90000`; it never goes negative; when paused (`endsAt:null, remainingMs:42000`) the result is `42000`; the Review Focus 1 case is `remainingMs(state, clientNow + clockOffset(...))` being equal across two simulated clients whose clocks differ by 40s
  - votes: `canVote('viewer','voting',0) === false`; `canVote('team','voting',3) === false`; `canVote('product_owner','voting',2) === true`; `canVote('team','writing',0) === false`
  - validate: `validateName('   ')` → `empty`; `validateCard('x'.repeat(501))` → `too_long`; `validateCard('  hi ')` → `{ok:true,value:'hi'}`; `isHostEmailAllowed('a@acme.com','acme.com, foo.io') === true`; `isHostEmailAllowed('a@x.com','acme.com') === false`; `isHostEmailAllowed('a@x.com','') === true`; `generateCode` matches `/^[A-HJ-NP-Z2-9]{6}$/`
  - mood, per the spec table: lobby → `happy`; writing, running, 60s left → `focused`; running, 30s left → `nervous`; started, 0s left, not running → `surprised`; reveal → `excited`; discussion with `to_improve` → `sad`, with `went_well` → `happy`, with `ideas` → `excited`; summary → `celebrate`
  - markdown: the output contains the title, the three column headings and each action as `- [ ] text — owner (date) ↳ refs`, with cards sorted by votes descending
- [ ] **Step 2:** Run `npx vitest run tests/unit/domain`. Expected: FAIL.
- [ ] **Step 3:** Implement the modules.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat: domain logic`.

### Task 4: Pixel Claude mascot

**Files:**
- Create: `src/components/mascot/sprites.ts`, `src/components/mascot/Mascot.tsx`
- Test: `tests/unit/mascot.test.tsx`

**Interfaces:**
- Consumes: `Mood` from Task 3.
- Produces: `SPRITES: Record<Mood, { frames: string[][]; fps: number; loop: boolean }>`. Each frame is an array of equal-length strings. `.` is transparent, `o` is body `#D97757`, `k` is eyes and dark detail `#1F1E1D`, `w` is highlight, `t` is a tear `#6CA6E0`. `<Mascot mood={Mood} size?: number (default 96) onDone?: () => void />`. Non-looping moods (`jump`, `surprised`) call `onDone` after their last frame.

- [ ] **Step 1: Write the failing tests:** every mood has at least 2 frames; all frames of a mood share the same width and height; the only characters used are `.okwt`; `<Mascot mood="sad">` renders an `svg` with `shape-rendering="crispEdges"` and `role="img"` with an aria-label from i18n; under mocked `prefers-reduced-motion: reduce` only frame 0 renders and no interval is set.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Draw the sprites, about a 16×12 grid, recreating the Claude Code pixel character (wide orange body, two square dark eyes, small arms and legs). Per mood: `happy` blinks and bobs; `wave` raises an arm; `jump` moves up 1→3→1 pixels with a squash; `focused` breathes slowly; `nervous` jitters 1px left and right; `surprised` widens its eyes; `excited` bounces fast; `sad` has drooped eyes, a tear and a 1px lower body; `celebrate` jumps with arms up. Render each pixel as a `rect`. Advance frames with a `setInterval` at `fps`, and crossfade between moods with a Framer Motion `AnimatePresence` (150ms).
- [ ] **Step 4:** Run it. Expected: PASS. Also add a `/dev/mascot` page (dev-only, `notFound()` in production) that shows every mood, and check it visually in the browser pane in both themes.
- [ ] **Step 5: Commit** with the message `feat: animated pixel Claude mascot`.

### Task 5: Auth, landing, dashboard and create/join

**Files:**
- Create: `src/app/page.tsx` (landing), `src/app/login/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/dashboard/page.tsx`, `src/app/actions.ts`, `src/components/retro/JoinForm.tsx`, `src/middleware.ts` (Supabase session refresh)
- Test: `tests/unit/actions.test.ts`, `tests/unit/joinform.test.tsx`

**Interfaces:**
- Consumes: `validateName`, `isHostEmailAllowed`, `generateCode`, the `join_retro` RPC, the supabase clients.
- Produces: `createRetro(title: string): Promise<{ code: string } | { error: 'not_signed_in' | 'domain_not_allowed' }>`, which retries `generateCode` on a unique-constraint clash (at most 5 times). `<JoinForm code={string} onJoined={(participantId: string) => void} />`, which signs in anonymously if there is no session, then calls `join_retro`.

- [ ] **Step 1: Write the failing tests** (mock the supabase server client): `createRetro` returns `not_signed_in` for an anonymous user and `domain_not_allowed` when the env restricts the domain; a code collision on the first insert retries and succeeds. JoinForm: submit is disabled until the name is valid; the four role options render with localized labels; the Viewer option shows the "watch only" hint.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the files. The landing page has a big serif headline, the mascot waving, "Start a retro" (goes to `/login` if signed out, otherwise opens a create dialog) and "Join with code" (a 6-character input that goes to `/r/CODE`). The login page sends a magic link with `signInWithOtp` and `emailRedirectTo=${origin}/auth/callback?next=/dashboard`. The dashboard lists the host's retros (title, date, phase badge) with links.
- [ ] **Step 4:** Run the tests. Expected: PASS. Manual check in the browser pane: sign in with a magic link, create a retro, and get redirected to `/r/CODE`.
- [ ] **Step 5: Commit** with the message `feat: auth, landing, dashboard, create/join`.

### Task 6: Live session state and host controls

**Files:**
- Create: `src/components/retro/useRetro.ts`, `src/app/r/[code]/host-actions.ts`, `src/components/retro/HostBar.tsx`, `src/components/retro/Timer.tsx`, `src/components/retro/PhaseStepper.tsx`, `src/components/retro/Participants.tsx`, `src/app/r/[code]/page.tsx`
- Test: `tests/unit/host-actions.test.ts`, `tests/unit/timer-view.test.tsx`

**Interfaces:**
- Consumes: the Task 2 RPCs and Realtime; the Task 3 timer, phases and mood; the Task 4 Mascot.
- Produces: `useRetro(code: string): { retro: RetroRow | null; me: ParticipantRow | null; isHost: boolean; participants: ParticipantRow[]; online: Set<string>; cards: CardView[]; counts: Record<string, number>; myVotes: VoteRow[]; totals: Record<string, number>; actions: ActionItemView[]; offsetMs: number; notify: (e: 'cards_changed' | 'votes_changed') => void }`. Channel `retro:{id}`: postgres_changes on `retros`, `participants`, `action_items` and `action_item_refs` (filter `retro_id=eq.{id}`), broadcast `cards_changed`/`votes_changed`, which trigger a refetch of the RPCs, and presence keyed by participant id. It refetches everything on reconnect.
- Produces (host-actions, each verifying `is_host` and returning `{ ok: true } | { error: 'forbidden' }`): `setPhase(retroId, phase)`, `startTimer(retroId, durationMs)`, `pauseTimer(retroId)`, `resumeTimer(retroId)`, `addMinute(retroId)`, `resetTimer(retroId)`, `setShowAuthors(retroId, v: boolean)`, `setFocusedCard(retroId, cardId | null)`, `setPhaseDuration(retroId, phase, ms)`.

- [ ] **Step 1: Write the failing tests:** each host action returns `forbidden` for a non-host session (Review Focus 5); `addMinute` on a paused timer adds 60000 to `timer_remaining_ms`, and on a running one adds 60s to `timer_ends_at`; `setPhase` resets the timer to that phase's duration (paused, not started). Timer view: it shows `mm:ss` from `remainingMs(t, Date.now()+offset)`, gets the `warning` style at ≤30s, and plays a soft chime once at 0 only if sound is enabled.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the files. The page flow: no participant for this user → `JoinForm`; joined → a session shell with a header (title, code with copy-link, PhaseStepper, Participants avatars with role badges and an online dot, ThemeToggle, LocaleToggle), a mascot driven by `moodFor` that switches to `jump` briefly whenever a new participant appears in lobby, a HostBar only when `isHost` (prev/next phase, timer controls, duration picker, show-authors switch, sound toggle), and a phase body slot. Animate phase changes with an `AnimatePresence` slide, mirrored in RTL.
- [ ] **Step 4:** Run the tests. Expected: PASS. Manual check with two browser tabs (host plus an anonymous tab): phase and timer changes show in the other tab within about 1s.
- [ ] **Step 5: Commit** with the message `feat: live session state and host controls`.

### Task 7: Board phases (writing, reveal, voting, discussion)

**Files:**
- Create: `src/components/retro/Board.tsx`, `src/components/retro/Column.tsx`, `src/components/retro/Card.tsx`, `src/components/retro/CardComposer.tsx`, `src/components/retro/VoteButton.tsx`
- Test: `tests/unit/board.test.tsx`

**Interfaces:**
- Consumes: `useRetro` (Task 6), `validateCard` and `canVote`/`votesLeft` (Task 3), `setFocusedCard` (Task 6).
- Produces: `<Board phase={Phase} data={ReturnType<typeof useRetro>} />`, rendering the phase-specific UI below, and `<Card card={CardView} … onMakeAction?={(cardId: string) => void} />`.

- [ ] **Step 1: Write the failing tests:**
  - writing: the composer shows for team, PO and scrum_master but not for a viewer; empty text can't submit; other people's cards are not rendered, only "Name wrote 3" chips from `counts`
  - reveal: all cards render; the author is hidden when `author_participant_id` is null
  - voting: shows "2 votes left" from `votesLeft`; the vote button is disabled at 0 left or for a viewer; no totals are shown
  - discussion: cards are sorted by `totals` descending; the host sees a "Focus" button; the focused card has `data-focused="true"`
  - long Arabic text in a card gets `dir="auto"`
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the components. There are three columns, stacked on mobile, each with an accent tint. Cards are inserted directly through supabase (RLS enforces the rules) and followed by `notify('cards_changed')`; votes work the same way with `votes_changed`. Animations: cards spring in on add; on reveal a staggered 3D flip (rotateY) that mirrors in RTL; a vote pulse with a small `+1`; on entering discussion the totals count up; the focused card scales to 1.03 with a primary ring while the others dim to 60%.
- [ ] **Step 4:** Run the tests. Expected: PASS. Manual check with two tabs through all four phases, in AR and EN and in both themes.
- [ ] **Step 5: Commit** with the message `feat: writing, reveal, voting and discussion phases`.

### Task 8: Action plan, summary and export

**Files:**
- Create: `src/components/retro/ActionPlan.tsx`, `src/components/retro/ActionItemEditor.tsx`, `src/components/retro/CardRefPicker.tsx`, `src/app/r/[code]/summary/page.tsx`, `src/components/retro/Summary.tsx`
- Modify: `src/app/r/[code]/host-actions.ts` (add the action-item actions), `src/components/retro/Card.tsx` (the "Make action" button in discussion)
- Test: `tests/unit/action-plan.test.tsx`, `tests/unit/host-actions.test.ts` (extend)

**Interfaces:**
- Consumes: `useRetro`, `toMarkdown`, `Mascot`.
- Produces: `createActionItem(retroId, input: { text: string; ownerText: string; ownerParticipantId: string | null; dueDate: string | null; cardIds: string[] }): Promise<{ id: string } | { error: 'forbidden' | 'invalid' }>`, `updateActionItem(id, input)`, `deleteActionItem(id)`, `reorderActionItems(retroId, ids: string[])`. `invalid` means empty text.

- [ ] **Step 1: Write the failing tests:** a non-host gets `forbidden`; empty text gets `invalid`; `cardIds` are stored as refs and replaced on update. UI: the editor shows only for the host; the owner combobox lists participants and accepts free text; CardRefPicker allows several cards and shows them as chips; clicking a chip on an item highlights that card (`data-highlighted`); "Make action" on a card in discussion opens the editor prefilled with that ref; the summary renders the actions with their refs and "Copy as Markdown" puts the `toMarkdown` output on the clipboard.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the files. In the action_plan phase the layout is the action list on one side and the voted cards (smaller, still referenceable) on the other. Items animate in as they're added for everyone (postgres_changes). Summary: the mascot `celebrate` with confetti (a small canvas burst, skipped under reduced motion), stats (participants, cards, votes), the cards by column with vote counts, the action plan, "Copy as Markdown" and "Print / PDF" (`window.print()` with a print stylesheet that hides controls). The `/r/[code]/summary` route is the same view, read-only, for members.
- [ ] **Step 4:** Run the tests. Expected: PASS. Manual check: create two actions referencing three cards, then confirm the other tab sees them live and that the Markdown is correct.
- [ ] **Step 5: Commit** with the message `feat: action plan with card references, summary and export`.

### Task 9: Deploy (GitHub, Vercel, Supabase auth URLs)

**Files:**
- Create: `README.md` (setup, env vars, how to run tests)

- [ ] **Step 1:** Check the tools with `gh auth status` and `npx vercel whoami`. If either isn't signed in, ask the user to run `gh auth login` / `npx vercel login` in the terminal and wait. Don't type their credentials.
- [ ] **Step 2:** Run `npm test && npm run build`. Expected: all pass.
- [ ] **Step 3:** Ask the user for the GitHub repo name and visibility (default `claude-retro`, private). Then run `gh repo create <name> --private --source . --push`.
- [ ] **Step 4:** Run `npx vercel link` (new project), set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `ALLOWED_HOST_EMAIL_DOMAINS` (empty) for production with `vercel env add`, connect the GitHub repo with `vercel git connect`, then run `npx vercel --prod`. Expected: a production URL.
- [ ] **Step 5:** In Supabase Auth, set the Site URL to the production URL and add `<url>/auth/callback` and `http://localhost:3000/auth/callback` to the redirect URLs (through the tools, or exact dashboard steps for the user). Note in the README that Supabase's built-in email has low send limits and that custom SMTP is the fix.
- [ ] **Step 6: End-to-end check on production** with the browser pane: the host signs in, creates a retro and copies the link; a second tab joins as Viewer and a third as Product Owner; run through all 7 phases; confirm the hidden cards, the vote limit, the hidden votes, the timer sync, the action refs and the summary; toggle AR/EN and dark/light.
- [ ] **Step 7: Commit and push** with the message `docs: README and deploy notes`.
