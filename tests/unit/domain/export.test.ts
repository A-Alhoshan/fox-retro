import { describe, it, expect } from "vitest";
import { buildExport, exportFileName, isRtl, type ExportInput } from "@/lib/domain/export";
import { toMarkdown } from "@/lib/domain/markdown";
import type { CardView, ParticipantRow, RetroRow } from "@/lib/domain/types";

const retro: RetroRow = {
  id: "r1",
  code: "ABC123",
  title: "Sprint 24",
  host_user_id: "u-ali",
  phase: "summary",
  timer_ends_at: null,
  timer_remaining_ms: null,
  timer_started: false,
  phase_durations: {},
  show_authors: true,
  votes_per_person: 3,
  focused_card_id: null,
  created_at: "2026-11-20T10:00:00Z",
};
const p = (id: string, user_id: string, name: string, role: ParticipantRow["role"]): ParticipantRow => ({
  id,
  retro_id: "r1",
  user_id,
  name,
  role,
  created_at: "",
});
const participants = [
  p("p-ali", "u-ali", "Ali", "scrum_master"),
  p("p-sara", "u-sara", "Sara Ahmed", "team"),
  p("p-lina", "u-lina", "Lina", "product_owner"),
  p("p-vic", "u-vic", "Vic", "viewer"),
];
const card = (id: string, column: CardView["column"], text: string): CardView => ({
  id,
  column,
  text,
  created_at: null,
  author_participant_id: "p-sara",
  is_mine: false,
});
const long = "x".repeat(80);
const input: ExportInput = {
  retro,
  participants,
  cards: [
    card("c1", "went_well", "Pairing"),
    card("c2", "went_well", "Demos"),
    card("c3", "to_improve", "Flaky CI"),
    card("c4", "to_improve", long),
    card("c5", "went_well", "التعاون كان ممتاز"),
  ],
  totals: { c1: 1, c2: 4, c3: 5, c4: 2 },
  actions: [
    {
      id: "a1",
      retro_id: "r1",
      text: "Fix CI",
      owner_text: "",
      owner_participant_id: "p-omar-missing",
      due_date: "2026-11-27",
      position: 0,
      cardIds: ["c3", "c4"],
    },
    {
      id: "a2",
      retro_id: "r1",
      text: "Pair more",
      owner_text: "",
      owner_participant_id: "p-sara",
      due_date: null,
      position: 1,
      cardIds: [],
    },
  ],
};
input.actions[0].owner_text = "Omar";

describe("buildExport", () => {
  const m = buildExport(input);

  it("orders sections went well → improve → ideas, cards by votes", () => {
    expect(m.sections.map((s) => s.heading)).toEqual(["What went well", "What could be improved", "Ideas"]);
    expect(m.sections[0].items.map((i) => i.text)).toEqual(["Demos", "Pairing", "التعاون كان ممتاز"]);
    expect(m.sections[0].items[0].votes).toBe(4);
  });

  it("maps roles and finds the facilitator", () => {
    expect(m.participants).toEqual([
      { name: "Ali", role: "Scrum Master" },
      { name: "Sara Ahmed", role: "Team" },
      { name: "Lina", role: "PO" },
      { name: "Vic", role: "Viewer" },
    ]);
    expect(m.facilitator).toBe("Ali");
    expect(buildExport({ ...input, participants: participants.slice(1) }).facilitator).toBeNull();
  });

  it("counts stats", () => {
    expect(m.stats).toEqual({ participants: 4, cards: 5, votes: 12, actions: 2 });
  });

  it("resolves owners and links actions to cut card texts", () => {
    expect(m.actions[0]).toEqual({
      text: "Fix CI",
      owner: "Omar",
      due: "27 Nov 2026",
      from: ["Flaky CI", "x".repeat(59) + "…"],
    });
    expect(m.actions[1].owner).toBe("Sara Ahmed");
    expect(m.actions[1].due).toBeNull();
    expect(m.actions[0].from[1]).toHaveLength(60);
  });

  it("formats dates", () => {
    expect(m.dateLabel).toBe("20 Nov 2026");
    expect(m.isoDate).toBe("2026-11-20");
  });

  it("never carries card authors", () => {
    for (const s of m.sections) for (const i of s.items) expect(Object.keys(i).sort()).toEqual(["text", "votes"]);
  });
});

describe("exportFileName", () => {
  it("slugs the title and falls back to retro", () => {
    const m = buildExport(input);
    expect(exportFileName({ ...m, title: 'Sprint 24 / Q4: "final"' })).toBe("sprint-24-q4-final-retro-2026-11-20.docx");
    expect(exportFileName({ ...m, title: "ريترو السبرنت" })).toBe("retro-retro-2026-11-20.docx");
  });
});

describe("isRtl", () => {
  it("follows the first strong letter, like Word and browsers", () => {
    expect(isRtl("التعاون")).toBe(true);
    expect(isRtl("Pairing")).toBe(false);
    expect(isRtl("Thanks to محمد for the demo")).toBe(false);
    expect(isRtl("محمد did the demo")).toBe(true);
    expect(isRtl("🎉 3 التعاون")).toBe(true);
    expect(isRtl("﻿hello")).toBe(false);
  });
});

describe("invalid created_at", () => {
  it.each(["", "garbage"])("%j still gives a valid file name and a dash for the date", (created_at) => {
    const m = buildExport({ ...input, retro: { ...retro, created_at } });
    expect(m.dateLabel).toBe("—");
    expect(m.isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(exportFileName(m)).toMatch(/^sprint-24-retro-\d{4}-\d{2}-\d{2}\.docx$/);
  });
});

describe("toMarkdown", () => {
  it("renders the Confluence-style English structure", () => {
    const md = toMarkdown(buildExport(input));
    expect(md).toContain("# Sprint 24");
    expect(md).toContain("**Facilitator:** Ali");
    expect(md).toContain("## What went well");
    expect(md).toContain("## What could be improved");
    expect(md).toContain("## Ideas");
    expect(md).toContain("- Demos (4)");
    expect(md).toContain("- [ ] Fix CI — Omar (27 Nov 2026)");
    expect(md.indexOf("Demos")).toBeLessThan(md.indexOf("Pairing"));
  });

  it("keeps multi-line cards inside their bullet", () => {
    const md = toMarkdown(buildExport({ ...input, cards: [card("c9", "ideas", "line one\nline two")], totals: {} }));
    expect(md).toContain("- line one\n  line two");
  });

  it("handles an empty retro", () => {
    const md = toMarkdown(buildExport({ ...input, cards: [], totals: {}, actions: [] }));
    expect(md).toContain("## Ideas\n\n- None");
    expect(md).toContain("No action items.");
  });
});
