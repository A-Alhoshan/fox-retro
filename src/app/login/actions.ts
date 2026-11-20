"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { isHostEmailAllowed } from "@/lib/domain/validate";
import { normalizePin, pinPassword, validatePin } from "@/lib/domain/pin";

export type LoginError = "invalid" | "domain_not_allowed" | "failed" | "wrong_pin" | "format" | "weak" | "mismatch";
type Err = { error: LoginError };
type Locked = { locked: number };

const secret = () => {
  const s = process.env.PIN_SECRET;
  return s && s.length >= 32 ? s : null;
};

function cleanEmail(email: string): string | Err {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "invalid" };
  if (!isHostEmailAllowed(clean, process.env.ALLOWED_HOST_EMAIL_DOMAINS)) return { error: "domain_not_allowed" };
  return clean;
}

const minutesLeft = (until: string) => Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60_000));

async function pinCheck(sb: SupabaseClient, key: string, email: string) {
  const { data, error } = await sb.rpc("pin_check", { p_key: key, p_email: email });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return { exists: Boolean(row.account_exists), lockedUntil: (row.locked_until as string | null) ?? null };
}

async function pinRecord(sb: SupabaseClient, key: string, email: string, ok: boolean): Promise<string | null> {
  const { data } = await sb.rpc("pin_record", { p_key: key, p_email: email, p_ok: ok });
  return (data as string | null) ?? null;
}

function checkPinPair(pin: string, confirm: string): string | Err {
  const p = normalizePin(pin);
  const v = validatePin(p);
  if (!v.ok) return { error: v.error };
  if (p !== normalizePin(confirm)) return { error: "mismatch" };
  return p;
}

export async function checkEmail(email: string): Promise<{ status: "new" | "existing" } | Locked | Err> {
  const clean = cleanEmail(email);
  if (typeof clean !== "string") return clean;
  const key = secret();
  if (!key) return { error: "failed" };
  const c = await pinCheck(await createServerClient(), key, clean);
  if (!c) return { error: "failed" };
  if (c.lockedUntil) return { locked: minutesLeft(c.lockedUntil) };
  return { status: c.exists ? "existing" : "new" };
}

export async function createAccount(email: string, pin: string, confirm: string): Promise<{ ok: true } | Err> {
  const clean = cleanEmail(email);
  if (typeof clean !== "string") return clean;
  const p = checkPinPair(pin, confirm);
  if (typeof p !== "string") return p;
  const key = secret();
  if (!key) return { error: "failed" };
  const sb = await createServerClient();
  const c = await pinCheck(sb, key, clean);
  if (!c || c.exists) return { error: "failed" };
  const { data, error } = await sb.auth.signUp({ email: clean, password: pinPassword(key, clean, p) });
  return error || !data?.session ? { error: "failed" } : { ok: true };
}

export async function signInWithPin(email: string, pin: string): Promise<{ ok: true } | Locked | Err> {
  const clean = cleanEmail(email);
  if (typeof clean !== "string") return clean;
  const p = normalizePin(pin);
  if (!/^\d{5}$/.test(p)) return { error: "format" };
  const key = secret();
  if (!key) return { error: "failed" };
  const sb = await createServerClient();
  const c = await pinCheck(sb, key, clean);
  if (!c) return { error: "failed" };
  if (c.lockedUntil) return { locked: minutesLeft(c.lockedUntil) };
  const { error } = await sb.auth.signInWithPassword({ email: clean, password: pinPassword(key, clean, p) });
  if (!error) {
    await pinRecord(sb, key, clean, true);
    return { ok: true };
  }
  if (error.code !== "invalid_credentials") return { error: "failed" };
  const until = await pinRecord(sb, key, clean, false);
  return until ? { locked: minutesLeft(until) } : { error: "wrong_pin" };
}

export async function sendPinReset(email: string, origin: string): Promise<{ ok: true } | Err> {
  const clean = cleanEmail(email);
  if (typeof clean !== "string") return clean;
  const sb = await createServerClient();
  const { error } = await sb.auth.resetPasswordForEmail(clean, {
    redirectTo: `${origin}/auth/callback?next=/login/new-pin`,
  });
  return error ? { error: "failed" } : { ok: true };
}

export async function setNewPin(pin: string, confirm: string): Promise<{ ok: true } | Err> {
  const p = checkPinPair(pin, confirm);
  if (typeof p !== "string") return p;
  const key = secret();
  if (!key) return { error: "failed" };
  const sb = await createServerClient();
  const user = (await sb.auth.getUser()).data.user;
  if (!user?.email || user.is_anonymous) return { error: "failed" };
  const email = user.email.toLowerCase();
  const { error } = await sb.auth.updateUser({ password: pinPassword(key, email, p) });
  if (error) return { error: "failed" };
  await pinRecord(sb, key, email, true);
  return { ok: true };
}
