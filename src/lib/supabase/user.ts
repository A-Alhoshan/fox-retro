import type { User } from "@supabase/supabase-js";
import { createServerClient } from "./server";

/** the signed-in, non-anonymous user (a host), or null */
export async function getHostUser(): Promise<User | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user && !user.is_anonymous ? user : null;
}
