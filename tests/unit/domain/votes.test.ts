import { describe, it, expect } from "vitest";
import { MAX_VOTES, votesLeft, canVote } from "@/lib/domain/votes";

describe("votes", () => {
  it("has 3 votes", () => expect(MAX_VOTES).toBe(3));
  it("votesLeft", () => {
    expect(votesLeft(0)).toBe(3);
    expect(votesLeft(3)).toBe(0);
    expect(votesLeft(5)).toBe(0);
  });
  it("viewer cannot vote", () => expect(canVote("viewer", "voting", 0)).toBe(false));
  it("cannot exceed 3", () => expect(canVote("team", "voting", 3)).toBe(false));
  it("product owner can vote with votes left", () => expect(canVote("product_owner", "voting", 2)).toBe(true));
  it("cannot vote outside voting phase", () => expect(canVote("team", "writing", 0)).toBe(false));
});
