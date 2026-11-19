"use server";

import { createServerClient } from "@/lib/supabase/server";
import { isHostEmailAllowed } from "@/lib/domain/validate";

export async function sendMagicLink(
  email: string,
  origin: string,
): Promise<{ ok: true } | { error: "invalid" | "domain_not_allowed" | "failed" }> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { error: "invalid" };
  if (!isHostEmailAllowed(clean, process.env.ALLOWED_HOST_EMAIL_DOMAINS)) return { error: "domain_not_allowed" };
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard`, shouldCreateUser: true },
  });
  return error ? { error: "failed" } : { ok: true };
}
