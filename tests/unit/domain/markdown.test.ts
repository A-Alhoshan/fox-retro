import { describe, it, expect } from "vitest";
import { toMarkdown } from "@/lib/domain/markdown";
import { translate, type MessageKey } from "@/i18n/messages";

const t = (k: MessageKey) => translate("en", k);

describe("toMarkdown", () => {
  const md = toMarkdown(
    {
      title: "Sprint 24",
      date: "2026-11-19",
      cards: [
        { column: "went_well", text: "Pairing", votes: 1 },
        { column: "went_well", text: "Demos", votes: 4 },
        { column: "to_improve", text: "Flaky CI", votes: 3 },
      ],
      actions: [{ text: "Fix CI", owner: "Sara", dueDate: "2026-11-26", refs: ["Flaky CI"] }],
    },
    t,
  );
  it("has title and column headings", () => {
    expect(md).toContain("# Sprint 24");
    expect(md).toContain("## What went well");
    expect(md).toContain("## What to improve");
    expect(md).toContain("## Ideas");
  });
  it("sorts cards by votes desc", () => {
    expect(md.indexOf("Demos")).toBeLessThan(md.indexOf("Pairing"));
  });
  it("renders actions with owner, date and refs", () => {
    expect(md).toContain("- [ ] Fix CI — Sara (2026-11-26) ↳ Flaky CI");
  });
});
