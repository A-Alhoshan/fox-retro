# Vote Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The host sets how many votes each person gets (1–10, default 3), and the database enforces it.

**Architecture:** Add a `retros.votes_per_person` column. The vote-limit trigger reads that column instead of the hard-coded 3. The UI reads the same column: the host edits it in the HostBar during voting, and the Board uses it for "votes left".

**Tech Stack:** Supabase Postgres (migration), Next.js server actions, React, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-vote-count-design.md`

## Global Constraints
- Column: `votes_per_person integer not null default 3 check (votes_per_person between 1 and 10)`.
- When the limit is lowered, existing votes are kept and new ones are blocked: the trigger keeps its `count >= limit` check. Removing a vote is always allowed.
- The control appears only in the `voting` phase, with the label `Votes per person` / `أصوات لكل شخص` and a hint.

## Review Focus
1. **Lowered below what someone has already used:** "votes left" shows 0 rather than a negative number, and the vote button is disabled. Tested in Task 2 (`votesLeft(5, 3) === 0`, `canVote` returns false).
2. **Invalid input** (0, 11, empty, decimal): the server action rejects it, and the input field snaps back to the current value. Tested in Task 2.
3. **Old retros or rows missing the field** (for example a stale realtime payload): the app falls back to 3. Tested in Task 2.
4. **Race between two votes at the limit:** the existing advisory lock in the trigger is kept. Checked in Task 1 by reading the migration.
5. **A non-host calling the action:** `asHost` returns forbidden (existing behaviour). Tested in Task 2.

---

### Task 1: Database
**Files:** Create `supabase/migrations/0003_votes_per_person.sql`. Modify `supabase/tests/rls_smoke.sql` to add a check that the limit follows the column.
- [ ] Write the migration: add the column, and `create or replace function public.enforce_vote_limit()` that keeps the advisory lock and compares the count against `(select r.votes_per_person from public.retros r where r.id = new.retro_id)`.
- [ ] Apply it to a Supabase branch or the project via MCP `apply_migration`. Verify with SQL: set the limit to 1, then a second insert raises `vote limit reached`.
- [ ] Commit.

### Task 2: App
**Files:**
- `src/lib/domain/types.ts`: add `votes_per_person: number` to `RetroRow`.
- `src/lib/domain/votes.ts`: rename `MAX_VOTES` to `DEFAULT_VOTES = 3`, and add `votesLimit(r: Pick<RetroRow,"votes_per_person"> | null | undefined): number` (falls back to 3, clamped to 1..10). Change the signatures to `votesLeft(used: number, limit: number)` and `canVote(role, phase, used, limit)`.
- `src/app/r/[code]/host-actions.ts`: add `setVotesPerPerson(retroId: string, n: number): Promise<Result>`, which returns invalid unless `n` is an integer from 1 to 10.
- `src/components/retro/HostBar.tsx`: during voting only, show a number input wrapped in a `Hint`. Commit on blur or Enter, and reset to the current value when the input is invalid.
- `src/components/retro/Board.tsx`: pass `votesLimit(retro)`.
- i18n: `host.votes` and `hint.votes` in en and ar.
- Fixtures: add `votes_per_person: 3` in `BoardPreview.tsx` and in the test fixtures.

**Tests:** `tests/unit/domain/votes.test.ts` (limit fallback and clamp, lowered limit), `tests/unit/host-actions.test.ts` (invalid input, forbidden), `tests/unit/host-hints.test.tsx` (the control shows only in voting and has a hint), `tests/unit/board.test.tsx` ("2 votes left" with a limit of 5 and 3 used).
- [ ] Write the tests, then run them and confirm they FAIL.
- [ ] Implement.
- [ ] Run `npm test` and `npx tsc --noEmit`, and confirm both PASS. Then check the change by eye on `/dev/board?phase=voting`.
- [ ] Commit, push, and deploy after the migration is live.
