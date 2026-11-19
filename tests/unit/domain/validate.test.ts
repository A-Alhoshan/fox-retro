import { describe, it, expect } from "vitest";
import { validateName, validateCard, isHostEmailAllowed, generateCode } from "@/lib/domain/validate";

describe("validateName", () => {
  it("rejects whitespace", () => expect(validateName("   ")).toEqual({ ok: false, error: "empty" }));
  it("rejects 41 chars", () => expect(validateName("a".repeat(41))).toEqual({ ok: false, error: "too_long" }));
  it("trims", () => expect(validateName("  Sara ")).toEqual({ ok: true, value: "Sara" }));
  it("accepts 40 chars", () => expect(validateName("a".repeat(40)).ok).toBe(true));
});

describe("validateCard", () => {
  it("rejects 501 chars", () => expect(validateCard("x".repeat(501))).toEqual({ ok: false, error: "too_long" }));
  it("accepts 500 chars", () => expect(validateCard("x".repeat(500)).ok).toBe(true));
  it("trims", () => expect(validateCard("  hi ")).toEqual({ ok: true, value: "hi" }));
  it("rejects empty", () => expect(validateCard("\n ")).toEqual({ ok: false, error: "empty" }));
});

describe("isHostEmailAllowed", () => {
  it("allows listed domain", () => expect(isHostEmailAllowed("a@acme.com", "acme.com, foo.io")).toBe(true));
  it("is case-insensitive", () => expect(isHostEmailAllowed("A@ACME.com", "acme.com")).toBe(true));
  it("blocks unlisted", () => expect(isHostEmailAllowed("a@x.com", "acme.com")).toBe(false));
  it("blocks look-alike domain", () => expect(isHostEmailAllowed("a@evilacme.com", "acme.com")).toBe(false));
  it("allows all when empty", () => expect(isHostEmailAllowed("a@x.com", "")).toBe(true));
  it("allows all when undefined", () => expect(isHostEmailAllowed("a@x.com", undefined)).toBe(true));
});

describe("generateCode", () => {
  it("is 6 unambiguous chars", () => {
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  });
  it("is deterministic with injected rand", () => {
    expect(generateCode(() => 0)).toBe("AAAAAA");
  });
});
