import { describe, it, expect, beforeAll } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { anonClient, hostClient, createRetro, join, setPhase, signInAgain } from "./helpers";

let host: SupabaseClient;
let hostCreds: { email: string; password: string };
let A: SupabaseClient;
let B: SupabaseClient;
let V: SupabaseClient;
let retro: { id: string; code: string };
let pA: string;
let pB: string;
let pV: string;
let cardA: string;

beforeAll(async () => {
  const h = await hostClient();
  host = h.client;
  hostCreds = h;
  [A, B, V] = await Promise.all([anonClient(), anonClient(), anonClient()]);
  retro = await createRetro(host);
  await join(host, retro.code, "Host", "scrum_master");
  pA = await join(A, retro.code, "Alice", "team");
  pB = await join(B, retro.code, "Bob", "product_owner");
  pV = await join(V, retro.code, "Vic", "viewer");
  await setPhase(host, retro.id, "writing");
  const { data, error } = await A.from("cards")
    .insert({ retro_id: retro.id, author_participant_id: pA, column: "to_improve", text: "Flaky CI" })
    .select("id")
    .single();
  if (error) throw error;
  cardA = data.id;
});

describe("writing", () => {
  it("B cannot see A's card via get_cards nor select from cards", async () => {
    const rpc = await B.rpc("get_cards", { p_retro: retro.id });
    expect(rpc.error).toBeNull();
    expect(rpc.data).toEqual([]);
    const direct = await B.from("cards").select("*").eq("retro_id", retro.id);
    expect(direct.data).toEqual([]);
  });

  it("A sees own card via get_cards with is_mine", async () => {
    const { data } = await A.rpc("get_cards", { p_retro: retro.id });
    expect(data).toHaveLength(1);
    expect(data![0].is_mine).toBe(true);
  });

  it("get_card_counts shows A has 1", async () => {
    const { data } = await B.rpc("get_card_counts", { p_retro: retro.id });
    expect(data).toContainEqual({ participant_id: pA, n: 1 });
  });

  it("viewer cannot insert a card", async () => {
    const { error } = await V.from("cards").insert({
      retro_id: retro.id,
      author_participant_id: pV,
      column: "ideas",
      text: "nope",
    });
    expect(error).not.toBeNull();
  });

  it("B cannot insert a card as A", async () => {
    const { error } = await B.from("cards").insert({
      retro_id: retro.id,
      author_participant_id: pA,
      column: "ideas",
      text: "spoof",
    });
    expect(error).not.toBeNull();
  });

  it("anon participant cannot update retros.phase", async () => {
    await A.from("retros").update({ phase: "summary" }).eq("id", retro.id);
    const { data } = await host.from("retros").select("phase").eq("id", retro.id).single();
    expect(data!.phase).toBe("writing");
  });

  it("anon user cannot create a retro", async () => {
    const { data: u } = await A.auth.getUser();
    const { error } = await A.from("retros").insert({ code: "ZZZZZZ", title: "x", host_user_id: u.user!.id });
    expect(error).not.toBeNull();
  });
});

describe("reveal and voting", () => {
  beforeAll(async () => {
    await B.from("cards").insert({ retro_id: retro.id, author_participant_id: pB, column: "went_well", text: "Demos" });
    await setPhase(host, retro.id, "reveal");
  });

  it("with show_authors=false author is hidden for B and for the host", async () => {
    for (const c of [B, host]) {
      const { data } = await c.rpc("get_cards", { p_retro: retro.id });
      const card = data!.find((x: { id: string }) => x.id === cardA);
      expect(card.author_participant_id).toBeNull();
    }
  });

  it("A still sees its own authorship", async () => {
    const { data } = await A.rpc("get_cards", { p_retro: retro.id });
    expect(data!.find((x: { id: string }) => x.id === cardA).author_participant_id).toBe(pA);
  });

  it("cannot add cards after writing", async () => {
    const { error } = await A.from("cards").insert({
      retro_id: retro.id,
      author_participant_id: pA,
      column: "ideas",
      text: "late",
    });
    expect(error).not.toBeNull();
  });

  it("3 votes on the same card succeed and the 4th is rejected", async () => {
    await setPhase(host, retro.id, "voting");
    for (let i = 0; i < 3; i++) {
      const { error } = await B.from("votes").insert({ retro_id: retro.id, card_id: cardA, participant_id: pB });
      expect(error).toBeNull();
    }
    const fourth = await B.from("votes").insert({ retro_id: retro.id, card_id: cardA, participant_id: pB });
    expect(fourth.error).not.toBeNull();
  });

  it("viewer cannot vote", async () => {
    const { error } = await V.from("votes").insert({ retro_id: retro.id, card_id: cardA, participant_id: pV });
    expect(error).not.toBeNull();
  });

  it("get_vote_totals is empty during voting", async () => {
    const { data } = await A.rpc("get_vote_totals", { p_retro: retro.id });
    expect(data).toEqual([]);
  });

  it("A cannot read B's votes", async () => {
    const { data } = await A.from("votes").select("*").eq("retro_id", retro.id);
    expect(data).toEqual([]);
  });

  it("get_vote_totals returns totals in discussion", async () => {
    await setPhase(host, retro.id, "discussion");
    const { data } = await A.rpc("get_vote_totals", { p_retro: retro.id });
    expect(data).toContainEqual({ card_id: cardA, n: 3 });
  });

  it("show_authors=true reveals authors", async () => {
    await setPhase(host, retro.id, "discussion", { show_authors: true });
    const { data } = await B.rpc("get_cards", { p_retro: retro.id });
    expect(data!.find((x: { id: string }) => x.id === cardA).author_participant_id).toBe(pA);
  });
});

describe("action items", () => {
  it("host can create an item with refs; participants read it; A cannot write", async () => {
    const { data: item, error } = await host
      .from("action_items")
      .insert({ retro_id: retro.id, text: "Fix CI", owner_text: "Alice" })
      .select("id")
      .single();
    expect(error).toBeNull();
    const ref = await host.from("action_item_refs").insert({ action_item_id: item!.id, card_id: cardA, retro_id: retro.id });
    expect(ref.error).toBeNull();
    const read = await A.from("action_item_refs").select("*").eq("retro_id", retro.id);
    expect(read.data).toHaveLength(1);
    const write = await A.from("action_items").insert({ retro_id: retro.id, text: "hack" });
    expect(write.error).not.toBeNull();
  });
});

describe("joining (Review Focus 2, 3, 5)", () => {
  it("join_retro twice from the same user returns same id and one participant row", async () => {
    const again = await join(A, retro.code, "Alice B.", "team");
    expect(again).toBe(pA);
    const { data } = await A.from("participants").select("id").eq("retro_id", retro.id);
    expect(data!.filter((p) => p.id === pA)).toHaveLength(1);
  });

  it("join_retro succeeds when phase is voting", async () => {
    await setPhase(host, retro.id, "voting");
    const late = await anonClient();
    const id = await join(late, retro.code.toLowerCase(), "Late", "team");
    expect(id).toBeTruthy();
  });

  it("join_retro rejects a whitespace-only name", async () => {
    const c = await anonClient();
    const { error } = await c.rpc("join_retro", { p_code: retro.code, p_name: "   ", p_role: "team" });
    expect(error).not.toBeNull();
  });

  it("host signed in on a second client can update phase", async () => {
    const second = await signInAgain(hostCreds.email, hostCreds.password);
    const { error } = await second.from("retros").update({ phase: "action_plan" }).eq("id", retro.id);
    expect(error).toBeNull();
    const { data } = await A.from("retros").select("phase").eq("id", retro.id).single();
    expect(data!.phase).toBe("action_plan");
  });

  it("a non-member cannot see the retro row", async () => {
    const stranger = await anonClient();
    const { data } = await stranger.from("retros").select("*").eq("id", retro.id);
    expect(data).toEqual([]);
    const byCode = await stranger.rpc("get_retro_by_code", { p_code: retro.code });
    expect(byCode.data).toHaveLength(1);
  });
});
