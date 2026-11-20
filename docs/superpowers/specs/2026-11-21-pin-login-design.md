# Host sign-in with a 5-digit PIN — design

## Why
Magic-link emails add friction (wait for an email, 25/hour cap, deliverability abroad).
The host should sign in with email + a 5-digit PIN. Email is sent **only** for "forgot PIN".

## Goals
- Step 1: host types email → Continue.
- New email → "Create your 5-digit PIN" (type twice) → signed in immediately, no email.
- Existing email → "Enter your PIN" → signed in.
- "Forgot PIN?" → reset email → link opens a page to set a new PIN → signed in.
- 5 wrong PINs → account locked for 15 minutes (message shows the minutes left).

## Non-goals / anti-goals
- No change for participants (still name + role, anonymous).
- No WebAuthn passkeys, no SMS.
- Must not let anyone brute-force a PIN by calling Supabase directly, bypassing the lock.

## Approach (chosen: 5-digit PIN + lockout)
Alternatives considered: real passkey (Face ID / fingerprint) — stronger but device-bound and
experimental in Supabase; keep magic link — what the user wants to remove.

## How it works
- **Server secret `PIN_SECRET`** (Vercel env, server-only, ≥32 random chars). The Supabase
  password is `HMAC-SHA256(PIN_SECRET, email + ":" + pin)` (hex). Supabase never sees 5 digits, its
  6-char minimum is met, and nobody without the secret can brute-force the auth API directly:
  every attempt must go through our server action, which enforces the lock.
- **Lock table** `private.pin_attempts(email pk, failures int, locked_until timestamptz)` with no
  client access. Two `SECURITY DEFINER` RPCs, each requiring `p_key` whose SHA-256 must match a hash
  stored in `private.app_secrets` (so only our server can call them):
  - `pin_check(p_key, p_email)` → `{ exists boolean, locked_until timestamptz | null }`
  - `pin_record(p_key, p_email, p_ok boolean)` → 5th consecutive failure sets
    `locked_until = now() + 15 min`; success (or a completed reset) clears the row.
- **Server actions** (`src/app/login/actions.ts`), all validate email + allowed host domain:
  - `checkEmail(email)` → `"new" | "existing" | { locked: minutesLeft }`
  - `createAccount(email, pin)` → `auth.signUp` (requires "Confirm email" OFF so a session comes back)
  - `signInWithPin(email, pin)` → check lock → `signInWithPassword` → `pin_record`
  - `sendPinReset(email, origin)` → `resetPasswordForEmail`, redirect to
    `/auth/callback?next=/login/new-pin`
  - `setNewPin(pin)` (signed-in via reset link) → `updateUser({ password })` → clear lock
- **PIN rules:** exactly 5 digits; reject all-same (`11111`) and straight runs (`12345`, `54321`).
- **Existing 8 accounts** have no PIN: they show as "existing", use "Forgot PIN?" once.

## Supabase settings to change
- Email provider: **Confirm email OFF** (sign-up returns a session, sends nothing).
- Rate limit "sign-ups and sign-ins": raise from 30 to 150 per 5 min, since all calls now come
  from Vercel's server IPs. Our own per-email lock is the real brute-force guard.
- Run the new migration; store the `PIN_SECRET` hash in `private.app_secrets` (by hand, not in git).

## UI
Same card on `/login`, three steps animated like today: email → (create PIN | enter PIN) → done.
PIN field: one input, `inputMode="numeric"`, `type="password"`, `maxLength=5`, `dir="ltr"`.
New page `/login/new-pin` for the reset link. Arabic + English strings.

## Left to the builder
Exact copy wording, animation details, error-to-message mapping.

## Known trade-offs (accepted)
- The email step reveals whether an email has an account (needed to show "create" vs "enter").
- Sign-up doesn't prove email ownership; the real owner can take it back via "Forgot PIN?".
- Anyone who knows an email can lock that account for 15 minutes by guessing wrong 5 times.
