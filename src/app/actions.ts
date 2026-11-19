"use server";

import { createServerClient } from "@/lib/supabase/server";
import { generateCode, isHostEmailAllowed } from "@/lib/domain/validate";

export async function createRetro(
  title: string,
): Promise<{ code: string } | { error: "not_signed_in" | "domain_not_allowed" | "failed" }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous || !user.email) return { error: "not_signed_in" };
  if (!isHostEmailAllowed(user.email, process.env.ALLOWED_HOST_EMAIL_DOMAINS)) return { error: "domain_not_allowed" };

  const clean = title.trim().slice(0, 120) || `Retro ${new Date().toISOString().slice(0, 10)}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("retros")
      .insert({ code: generateCode(), title: clean, host_user_id: user.id })
      .select("code")
      .single();
    if (!error && data) return { code: data.code };
    if (error?.code !== "23505") break;
  }
  return { error: "failed" };
}
