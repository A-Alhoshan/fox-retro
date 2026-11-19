# Fox Retro Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename Claude Retro to Fox Retro everywhere a user sees it, replace the pixel Claude with a blocky pixel fox across all 9 moods, and move the deployment to `fox-retro.vercel.app`.

**Architecture:** The mascot stays a parts-based pixel sprite in `src/components/mascot/sprites.ts`. We add fox parts (ears, white muzzle, tail) to the `Pose`/`draw()` system and keep the `Mascot` component, the `Mood` type and the `SPRITES` shape unchanged. Branding strings live in i18n, `layout.tsx` metadata, README and the generated README assets. The infra rename (GitHub, Vercel, Supabase Auth URLs) comes last.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest + Testing Library, Supabase, Vercel CLI, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-11-20-fox-retro-identity-design.md`

## Global Constraints

- Product name: `Fox Retro` in both locales. Mascot label: en `The fox is {mood}`, ar `الثعلب {mood}`.
- Colors and fonts **do not change**. `PIXEL_COLORS` keeps `o: #D97757`, `k: #1F1E1D`, `w: #FFFFFF`, `t: #6CA6E0`. The fox uses only the pixel chars `. o k w t`.
- The fox is design **A** (blocky): triangular ears with a dark inner pixel, a white muzzle with a dark nose, a tail with a white tip on the right, dark legs. Reference idle frame (16 wide; rows shown without the vertical padding):
  ```
  ...o........o...
  ...ok......ko...
  ...oooooooooo...
  ...oooooooooo...
  ...ookooookoo...
  ...ookooookoo...
  ...owwwkkwwwo..w
  ...owwwwwwwwo.ow
  ...oooooooooooo.
  ....k.k..k.k....
  ```
- Grid: `W = 16`, `H = 14`. Add enough top padding that no pose in any mood (including `jump`/`celebrate` at `dy: -3`) clips a pixel.
- All 9 moods stay (`happy, wave, jump, focused, nervous, surprised, excited, sad, celebrate`). Mood behaviour from the spec: happy wags its tail, focused has ears up and tail still, nervous has ears back and sweat, surprised has wide eyes and perked ears, sad has drooped ears and tail down plus a tear, celebrate hops with a curled tail and sparkles.
- Domain: `https://fox-retro.vercel.app`. GitHub repo: `A-Alhoshan/fox-retro`. Vercel project: `fox-retro`. The Supabase project name stays `claude-retro`.
- The README may keep the single "Built with Claude Code" credit line. Nothing else user-facing may say "Claude".

## Review Focus

1. **The fox at small sizes:** the header brand mark and the favicon must still read as a fox at 24–32px. Task 2 verifies this with a screenshot of the header at 1x.
2. **Reduced motion:** with `prefers-reduced-motion`, only frame 0 shows, so frame 0 of every mood must clearly show ears and tail. Task 1 tests this.
3. **Clipping during jumps:** a pose with `dy: -3` or perked ears must not lose pixels off the top edge. Task 1 tests this.
4. **Login after the domain move:** magic links sent before the rename point at the old URL, and new ones must land on `fox-retro.vercel.app/auth/callback`. Task 4 keeps both redirect URLs and checks the callback route returns a redirect, not a 404.
5. **Leftover "Claude" in the UI:** a string missed in some phase screen. Task 2 adds a test that scans `src/` for it.

---

### Task 1: Fox sprite parts and moods

**Files:**
- Modify: `src/components/mascot/sprites.ts`
- Modify: `src/i18n/en.ts:143`, `src/i18n/ar.ts:145` (mascot label)
- Test: `tests/unit/mascot.test.tsx`

**Interfaces:**
- Produces (exported from `sprites.ts`):
  - `W = 16`, `H = 14`
  - `type Ears = "up" | "back" | "droop" | "perk"`, `type Tail = "still" | "wagA" | "wagB" | "down" | "curl"`. These are added to `Pose` as `ears?: Ears` and `tail?: Tail` (defaults `"up"` and `"still"`).
  - `draw(p: Pose, onClip?: () => void): string[]`. Calls `onClip` once for every pixel that falls outside the grid.
  - `POSES: Record<Mood, { fps: number; loop: boolean; poses: Pose[] }>`
  - `SPRITES: Record<Mood, Sprite>`, derived as `poses.map(p => draw(p))`. This is the same shape as today, so `Mascot.tsx` and `scripts/readme-assets.mts` keep working.
  - `PIXEL_COLORS`, unchanged.

- [ ] **Step 1: Update the tests in `tests/unit/mascot.test.tsx`**
  - Keep the existing `SPRITES` tests (frame sizes, `/^[.okwt]+$/`, animates, sad has a tear and happy has none).
  - Add `it.each(MOODS)("%s never clips", …)`: for every pose in `POSES[m].poses`, run `draw(pose, () => clipped++)` and `expect(clipped).toBe(0)`.
  - Add `"every frame looks like a fox"`: for every frame of every mood, the frame contains `w` (muzzle) and has an `o` pixel in a row above the first body row (ears). Assert with `expect(frame.join("")).toContain("w")` and check that the topmost non-`.` row index is less than the topmost row that contains 10 consecutive `o` characters.
  - Add `"tail moves when happy, drops when sad"`: `expect(draw({ tail: "wagA" })).not.toEqual(draw({ tail: "wagB" }))`, and `expect(draw({ tail: "down" })).not.toEqual(draw({}))`.
  - Add `"ears change with mood"`: `draw({ ears: "back" })`, `draw({ ears: "droop" })` and `draw({ ears: "perk" })` are each `not.toEqual(draw({}))`.
  - Change the label assertion to `expect(svg.getAttribute("aria-label")).toBe("The fox is sad")`.

- [ ] **Step 2: Run the tests to confirm they fail**

  Run: `npx vitest run tests/unit/mascot.test.tsx`
  Expected: FAIL (`POSES`/`draw` are not exported, and the label still says Claude).

- [ ] **Step 3: Implement the fox in `sprites.ts`**
  Redraw the body and parts to match the reference idle frame from Global Constraints, shifted down to leave room at the top. Arms stay as small side nubs (`wave`, `up` and `out` still work). Map each mood to its poses using the behaviour in Global Constraints. Update the header comment so it describes the fox and no longer mentions Claude. Mascot labels: en `"The fox is {mood}"`, ar `"الثعلب {mood}"`.

- [ ] **Step 4: Run the tests to confirm they pass**

  Run: `npx vitest run tests/unit/mascot.test.tsx`
  Expected: PASS

- [ ] **Step 5: Check every mood by eye**

  Run `npm run dev -- -p 3002` and open `http://localhost:3002/dev/mascot`. Every mood should read as a fox, nothing should be cut off, and the tail and ears should move as described. Take a screenshot as proof.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/mascot/sprites.ts src/i18n/en.ts src/i18n/ar.ts tests/unit/mascot.test.tsx
  git commit -m "feat: pixel fox mascot replaces pixel Claude"
  ```

### Task 2: Rename the product in the app

**Files:**
- Modify: `src/i18n/en.ts:3`, `src/i18n/ar.ts:5` (`name: "Fox Retro"`)
- Modify: `src/app/layout.tsx:18-19`. Set the title to `Fox Retro` and the description to `Live Scrum retrospectives your team actually looks forward to.`
- Modify: `src/app/globals.css:41,68`. Change the comments to `/* Brand palette — light */` and `/* Brand palette — dark */`.
- Modify: `package.json` (`"name": "fox-retro"`) and `package-lock.json` (top-level `name`, by running `npm install`).
- Modify: the header brand mark (find it from `src/components/SiteHeader.tsx`) if it draws the old creature itself rather than using `<Mascot>`.
- Create: `src/app/icon.svg`. This is the fox idle frame (frame 0 of `happy`) as a crisp SVG with `shape-rendering="crispEdges"`, cropped to the fox. Delete `src/app/favicon.ico`.
- Test: `tests/unit/branding.test.ts`

**Interfaces:**
- Consumes: `SPRITES.happy.frames[0]` and `PIXEL_COLORS` from Task 1 (to produce `icon.svg`, by hand or with a one-off script that is not committed).

- [ ] **Step 1: Write `tests/unit/branding.test.ts`**
  - `"no user-facing Claude in src"`: walk `src/` recursively with `node:fs`, read every `.ts`, `.tsx` and `.css` file, and `expect(hits).toEqual([])`, where `hits` lists the files that match `/claude/i`.
  - `"app name is Fox Retro in both locales"`: `expect(messages.en.app.name).toBe("Fox Retro")` and `expect(messages.ar.app.name).toBe("Fox Retro")`. Use the real key path from `src/i18n/messages.ts`.

- [ ] **Step 2: Run it and confirm it fails**

  Run: `npx vitest run tests/unit/branding.test.ts`
  Expected: FAIL. It should list `layout.tsx`, `en.ts`, `ar.ts` and `globals.css`.

- [ ] **Step 3: Make the renames and add the icon listed under Files.**

- [ ] **Step 4: Run the full suite**

  Run: `npm test` and then `npm run build`
  Expected: all tests pass, and the build succeeds.

- [ ] **Step 5: Check by eye**

  Open the landing page, the header in both locales and both themes, and the browser tab icon. At 1x zoom the header mark and the favicon should read as a fox. Take a screenshot as proof.

- [ ] **Step 6: Commit**
  ```bash
  git add -A src tests/unit/branding.test.ts package.json package-lock.json
  git commit -m "feat: rename product to Fox Retro with fox favicon"
  ```

### Task 3: README and generated assets

**Files:**
- Modify: `scripts/readme-assets.mts:55`. Change the wordmark to `Fox Retro`, keep the fonts and colors, and update the alt and title text in the generated SVGs.
- Regenerate: `docs/assets/banner-{light,dark}.svg` and `docs/assets/moods-{light,dark}.svg` (`node scripts/readme-assets.mts`).
- Modify: `scripts/screenshots.ps1`. Add a `param([string]$Base = "http://localhost:3000")` and use `$Base` in every URL.
- Regenerate: `docs/assets/*.png` (`powershell -File scripts/screenshots.ps1 -Base http://localhost:3002` while the dev server runs on 3002).
- Modify: `README.md`. Rename every use of Claude Retro to Fox Retro and the mascot to "the pixel fox". Set the live demo link to `https://fox-retro.vercel.app` and the clone URL to `https://github.com/A-Alhoshan/fox-retro.git`. Update the Arabic section to match. Remove the trademark disclaimer paragraph under "Notes". Keep "Built with ❤️ and Claude Code".
- Modify: `.env.example`. No change is needed unless it mentions the name.

- [ ] **Step 1: Regenerate the SVG assets and confirm the fox shows in them** (open `docs/assets/moods-dark.svg` in the browser).
- [ ] **Step 2: Update and run the screenshots script.** All 6 PNGs should be rewritten and show the fox.
- [ ] **Step 3: Edit the README.**
- [ ] **Step 4: Verify**

  Run: `grep -rniE "claude" README.md docs/assets/*.svg scripts/`
  Expected: the only hit is the "Built with … Claude Code" line.

- [ ] **Step 5: Commit**
  ```bash
  git add README.md docs/assets scripts
  git commit -m "docs: Fox Retro README, banners, moods and screenshots"
  ```

### Task 4: Move GitHub, Vercel and Supabase Auth to fox-retro

These are outward-facing changes. Confirm with the user right before running them.

- [ ] **Step 1: Rename the GitHub repo**
  ```bash
  gh repo rename fox-retro -R A-Alhoshan/claude-retro --yes
  git remote set-url origin https://github.com/A-Alhoshan/fox-retro.git
  git push origin main
  ```
  Expected: `gh repo view A-Alhoshan/fox-retro` succeeds, and the old URL redirects.

- [ ] **Step 2: Rename the Vercel project and attach the domain**
  `vercel link --project retrospective-tool --yes`, then rename the project to `fox-retro` (`vercel project rename retrospective-tool fox-retro` if the CLI supports it; otherwise do it through the dashboard or the API with the user). Then run `vercel domains add fox-retro.vercel.app` (or `vercel alias`) and `vercel --prod`.
  Expected: `curl -s -o /dev/null -w "%{http_code}" https://fox-retro.vercel.app` returns `200`. The old `retrospective-tool-virid.vercel.app` keeps working.

- [ ] **Step 3: Update the Supabase Auth URLs** (project `sxdwfhneupfnydvigkya`)
  Set the Site URL to `https://fox-retro.vercel.app`. Add `https://fox-retro.vercel.app/auth/callback` to the Redirect URLs, and keep the old URL and `http://localhost:3000/auth/callback`. Supabase MCP has no auth-config tool, so the user does this in Dashboard → Authentication → URL Configuration. Give them the exact values.

- [ ] **Step 4: Verify login end to end**
  `curl -s -o /dev/null -w "%{http_code}" "https://fox-retro.vercel.app/auth/callback"` should return a 3xx, not a 404. Then the user requests a magic link on `fox-retro.vercel.app/login` and confirms that the email link lands back on `fox-retro.vercel.app`.

- [ ] **Step 5: Update local references**
  In `C:\Users\A\.claude\launch.json`, the `claude-retro` entry keeps its cwd (the local folder is not renamed). Update the memory notes with the new repo slug and domain.
