import { describe, it, expect } from "vitest";
import { PHASES, phaseRank, nextPhase, prevPhase } from "@/lib/domain/phases";

describe("phases", () => {
  it("has the 7 phases in order", () =>
    expect(PHASES).toEqual(["lobby", "writing", "reveal", "voting", "discussion", "action_plan", "summary"]));
  it("ranks", () => expect(phaseRank("discussion")).toBeGreaterThan(phaseRank("voting")));
  it("next/prev", () => {
    expect(nextPhase("lobby")).toBe("writing");
    expect(nextPhase("summary")).toBeNull();
    expect(prevPhase("lobby")).toBeNull();
    expect(prevPhase("reveal")).toBe("writing");
  });
});
