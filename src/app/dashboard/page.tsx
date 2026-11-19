import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getHostUser } from "@/lib/supabase/user";
import type { Phase } from "@/lib/domain/types";
import { Dashboard } from "./Dashboard";

export default async function DashboardPage() {
  const user = await getHostUser();
  if (!user) redirect("/login");
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("retros")
    .select("id, code, title, phase, created_at")
    .eq("host_user_id", user.id)
    .order("created_at", { ascending: false });
  return (
    <Dashboard
      email={user.email ?? ""}
      retros={(data ?? []) as { id: string; code: string; title: string; phase: Phase; created_at: string }[]}
    />
  );
}
