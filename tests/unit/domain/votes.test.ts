import { describe, it, expect } from "vitest";
import { DEFAULT_VOTES, votesLeft, canVote, votesLimit } from "@/lib/domain/votes";

describe("votes", () => {
  it("defaults to 3 votes", () => expect(DEFAULT_VOTES).toBe(3));

  it("votesLimit reads the retro and falls back to 3", () => {
    expect(votesLimit({ votes_per_person: 5 })).toBe(5);
    expect(votesLimit(null)).toBe(3);
    expect(votesLimit(undefined)).toBe(3);
    expect(votesLimit({} as { votes_per_person: number })).toBe(3);
    expect(votesLimit({ votes_per_person: 0 })).toBe(1);
    expect(votesLimit({ votes_per_person: 99 })).toBe(10);
  });

  it("votesLeft uses the limit and never goes negative", () => {
    expect(votesLeft(0, 3)).toBe(3);
    expect(votesLeft(3, 5)).toBe(2);
    expect(votesLeft(5, 3)).toBe(0);
  });

  it("viewer cannot vote", () => expect(canVote("viewer", "voting", 0, 3)).toBe(false));
  it("cannot exceed the limit", () => expect(canVote("team", "voting", 3, 3)).toBe(false));
  it("a raised limit allows more", () => expect(canVote("team", "voting", 3, 5)).toBe(true));
  it("a lowered limit blocks new votes", () => expect(canVote("team", "voting", 4, 2)).toBe(false));
  it("product owner can vote with votes left", () => expect(canVote("product_owner", "voting", 2, 3)).toBe(true));
  it("cannot vote outside voting phase", () => expect(canVote("team", "writing", 0, 3)).toBe(false));
});
