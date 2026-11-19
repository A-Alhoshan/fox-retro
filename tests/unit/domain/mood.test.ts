import { describe, it, expect } from "vitest";
import { moodFor } from "@/lib/domain/mood";

const base = { remainingMs: 0, timerRunning: false, timerStarted: false, focusedColumn: null } as const;

describe("moodFor", () => {
  it("lobby → happy", () => expect(moodFor({ ...base, phase: "lobby" })).toBe("happy"));
  it("writing with time → focused", () =>
    expect(moodFor({ ...base, phase: "writing", timerRunning: true, timerStarted: true, remainingMs: 60_000 })).toBe("focused"));
  it("last 30s → nervous", () =>
    expect(moodFor({ ...base, phase: "writing", timerRunning: true, timerStarted: true, remainingMs: 30_000 })).toBe("nervous"));
  it("time over → surprised", () =>
    expect(moodFor({ ...base, phase: "writing", timerRunning: false, timerStarted: true, remainingMs: 0 })).toBe("surprised"));
  it("writing, timer never started → focused", () => expect(moodFor({ ...base, phase: "writing" })).toBe("focused"));
  it("reveal → excited", () => expect(moodFor({ ...base, phase: "reveal" })).toBe("excited"));
  it("discussion to_improve → sad", () =>
    expect(moodFor({ ...base, phase: "discussion", focusedColumn: "to_improve" })).toBe("sad"));
  it("discussion went_well → happy", () =>
    expect(moodFor({ ...base, phase: "discussion", focusedColumn: "went_well" })).toBe("happy"));
  it("discussion ideas → excited", () =>
    expect(moodFor({ ...base, phase: "discussion", focusedColumn: "ideas" })).toBe("excited"));
  it("summary → celebrate", () => expect(moodFor({ ...base, phase: "summary" })).toBe("celebrate"));
});
