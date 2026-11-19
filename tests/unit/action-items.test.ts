import { describe, it, expect, vi, beforeEach } from "vitest";

type Op = { table: string; op: string; payload?: unknown; filters: [string, unknown][] };
const ops: Op[] = [];
const state = { isHost: true, itemRetro: "r1" as string | null };

function builder(table: string) {
  let current: Op | null = null;
  const b: Record<string, unknown> = {};
  const record = (op: string, payload?: unknown) => {
    current = { table, op, payload, filters: [] };
    ops.push(current);
    return b;
  };
  b.insert = (p: unknown) => record("insert", p);
  b.update = (p: unknown) => record("update", p);
  b.delete = () => record("delete");
  b.upsert = (p: unknown) => record("upsert", p);
  b.select = (_c?: string, o?: { head?: boolean }) => {
    if (!current) record(o?.head ? "count" : "select");
    return b;
  };
  b.eq = (k: string, v: unknown) => {
    current?.filters.push([k, v]);
    return b;
  };
  b.single = async () => {
    if (current?.op === "insert" && table === "action_items") return { data: { id: "a1" }, error: null };
    if (current?.op === "select" && table === "action_items")
      return state.itemRetro ? { data: { retro_id: state.itemRetro }, error: null } : { data: null, error: { code: "PGRST116" } };
    return { data: null, error: null };
  };
  b.then = (res: (v: unknown) => void) => res({ data: null, error: null, count: 2 });
  return b;
}

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: async () => ({
    rpc: async (fn: string) => (fn === "is_host" ? { data: state.isHost, error: null } : { data: null, error: null }),
    from: (t: string) => builder(t),
  }),
}));

import { createActionItem, updateActionItem, deleteActionItem, reorderActionItems } from "@/app/r/[code]/host-actions";

const input = { text: " Fix CI ", ownerText: "Sara", ownerParticipantId: "pB", dueDate: "2026-11-26", cardIds: ["c1", "c2"] };

beforeEach(() => {
  ops.length = 0;
  state.isHost = true;
  state.itemRetro = "r1";
});

describe("action item host actions", () => {
  it("non-host gets forbidden and nothing is written", async () => {
    state.isHost = false;
    expect(await createActionItem("r1", input)).toEqual({ error: "forbidden" });
    expect(await updateActionItem("a1", input)).toEqual({ error: "forbidden" });
    expect(await deleteActionItem("a1")).toEqual({ error: "forbidden" });
    expect(await reorderActionItems("r1", ["a1"])).toEqual({ error: "forbidden" });
    expect(ops.filter((o) => o.op !== "select" && o.op !== "count")).toHaveLength(0);
  });

  it("empty text is invalid", async () => {
    expect(await createActionItem("r1", { ...input, text: "   " })).toEqual({ error: "invalid" });
  });

  it("a bad due date is invalid", async () => {
    expect(await createActionItem("r1", { ...input, dueDate: "next week" })).toEqual({ error: "invalid" });
  });

  it("creates the item at the end and stores every ref", async () => {
    expect(await createActionItem("r1", input)).toEqual({ id: "a1" });
    const item = ops.find((o) => o.table === "action_items" && o.op === "insert")!;
    expect(item.payload).toEqual({
      retro_id: "r1",
      text: "Fix CI",
      owner_text: "Sara",
      owner_participant_id: "pB",
      due_date: "2026-11-26",
      position: 2,
    });
    const refs = ops.find((o) => o.table === "action_item_refs" && o.op === "insert")!;
    expect(refs.payload).toEqual([
      { action_item_id: "a1", card_id: "c1", retro_id: "r1" },
      { action_item_id: "a1", card_id: "c2", retro_id: "r1" },
    ]);
  });

  it("update replaces refs", async () => {
    expect(await updateActionItem("a1", { ...input, cardIds: ["c3"] })).toEqual({ ok: true });
    const del = ops.find((o) => o.table === "action_item_refs" && o.op === "delete")!;
    expect(del.filters).toContainEqual(["action_item_id", "a1"]);
    const ins = ops.find((o) => o.table === "action_item_refs" && o.op === "insert")!;
    expect(ins.payload).toEqual([{ action_item_id: "a1", card_id: "c3", retro_id: "r1" }]);
  });

  it("update of an unknown item is forbidden", async () => {
    state.itemRetro = null;
    expect(await updateActionItem("zz", input)).toEqual({ error: "forbidden" });
  });

  it("reorder writes positions in the given order", async () => {
    expect(await reorderActionItems("r1", ["a2", "a1"])).toEqual({ ok: true });
    const ups = ops.filter((o) => o.table === "action_items" && o.op === "update");
    expect(ups.map((u) => [u.payload, u.filters])).toEqual([
      [{ position: 0 }, [["id", "a2"], ["retro_id", "r1"]]],
      [{ position: 1 }, [["id", "a1"], ["retro_id", "r1"]]],
    ]);
  });
});
