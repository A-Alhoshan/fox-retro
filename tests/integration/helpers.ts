import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateCode } from "@/lib/domain/validate";
import type { Phase, Role } from "@/lib/domain/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

export function admin(): SupabaseClient {
  if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing in .env.local (integration tests only)");
  return createClient(url, service, opts);
}

export async function anonClient(): Promise<SupabaseClient> {
  const c = createClient(url, anon, opts);
  const { error } = await c.auth.signInAnonymously();
  if (error) throw error;
  return c;
}

/** a real (non-anonymous) host user, created with the admin API */
export async function hostClient(email?: string): Promise<{ client: SupabaseClient; email: string; password: string }> {
  const e = email ?? `host-${crypto.randomUUID()}@example.test`;
  const password = `pw-${crypto.randomUUID()}`;
  if (!email) {
    const { error } = await admin().auth.admin.createUser({ email: e, password, email_confirm: true });
    if (error) throw error;
  }
  const client = createClient(url, anon, opts);
  const { error } = await client.auth.signInWithPassword({ email: e, password });
  if (error) throw error;
  return { client, email: e, password };
}

export async function signInAgain(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url, anon, opts);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

export async function createRetro(host: SupabaseClient): Promise<{ id: string; code: string }> {
  const code = generateCode();
  const { data: u } = await host.auth.getUser();
  const { data, error } = await host
    .from("retros")
    .insert({ code, title: "Test retro", host_user_id: u.user!.id })
    .select("id, code")
    .single();
  if (error) throw error;
  return data;
}

export async function join(c: SupabaseClient, code: string, name: string, role: Role): Promise<string> {
  const { data, error } = await c.rpc("join_retro", { p_code: code, p_name: name, p_role: role });
  if (error) throw error;
  return data as string;
}

export async function setPhase(host: SupabaseClient, retroId: string, phase: Phase, extra: object = {}) {
  const { error } = await host.from("retros").update({ phase, ...extra }).eq("id", retroId);
  if (error) throw error;
}
