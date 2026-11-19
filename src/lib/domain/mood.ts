import type { Column, Mood, Phase } from "./types";

export type MoodInput = {
  phase: Phase;
  remainingMs: number;
  timerRunning: boolean;
  timerStarted: boolean;
  focusedColumn: Column | null;
};

export function moodFor(s: MoodInput): Mood {
  if (s.timerStarted && !s.timerRunning && s.remainingMs === 0 && s.phase !== "summary") return "surprised";
  if (s.timerRunning && s.remainingMs <= 30_000) return "nervous";
  switch (s.phase) {
    case "lobby":
      return "happy";
    case "writing":
    case "voting":
    case "action_plan":
      return "focused";
    case "reveal":
      return "excited";
    case "discussion":
      if (s.focusedColumn === "to_improve") return "sad";
      if (s.focusedColumn === "ideas") return "excited";
      return "happy";
    case "summary":
      return "celebrate";
  }
}
