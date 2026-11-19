import { describe, it, expect } from "vitest";
import { remainingMs, isRunning, clockOffset } from "@/lib/domain/timer";

const T = Date.parse("2026-11-19T10:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("timer", () => {
  it("counts down from endsAt", () => {
    expect(remainingMs({ endsAt: iso(T + 90_000), remainingMs: null }, T)).toBe(90_000);
  });
  it("never goes negative", () => {
    expect(remainingMs({ endsAt: iso(T - 5_000), remainingMs: null }, T)).toBe(0);
  });
  it("returns stored remaining when paused", () => {
    expect(remainingMs({ endsAt: null, remainingMs: 42_000 }, T)).toBe(42_000);
  });
  it("returns 0 when nothing is set", () => {
    expect(remainingMs({ endsAt: null, remainingMs: null }, T)).toBe(0);
  });
  it("isRunning only when endsAt is set", () => {
    expect(isRunning({ endsAt: iso(T), remainingMs: null })).toBe(true);
    expect(isRunning({ endsAt: null, remainingMs: 1 })).toBe(false);
  });
  it("two clients 40s apart agree after applying clockOffset", () => {
    const state = { endsAt: iso(T + 120_000), remainingMs: null };
    const clientA = T;
    const clientB = T + 40_000; // B's clock runs 40s ahead
    const offA = clockOffset(iso(T), clientA - 50, clientA + 50);
    const offB = clockOffset(iso(T), clientB - 50, clientB + 50);
    const later = 30_000;
    expect(remainingMs(state, clientA + later + offA)).toBe(remainingMs(state, clientB + later + offB));
    expect(remainingMs(state, clientA + later + offA)).toBe(90_000);
  });
});
