import type { Phase, Role } from "./types";

export const MAX_VOTES = 3;
export const votesLeft = (myVotes: number): number => Math.max(0, MAX_VOTES - myVotes);
export const canVote = (role: Role, phase: Phase, myVotes: number): boolean =>
  role !== "viewer" && phase === "voting" && myVotes < MAX_VOTES;
