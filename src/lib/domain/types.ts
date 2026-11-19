export type Phase = "lobby" | "writing" | "reveal" | "voting" | "discussion" | "action_plan" | "summary";
export type Role = "team" | "product_owner" | "scrum_master" | "viewer";
export type Column = "went_well" | "to_improve" | "ideas";
export type Mood =
  | "happy"
  | "wave"
  | "jump"
  | "focused"
  | "nervous"
  | "surprised"
  | "excited"
  | "sad"
  | "celebrate";

export const ROLES: Role[] = ["team", "product_owner", "scrum_master", "viewer"];
export const COLUMNS: Column[] = ["went_well", "to_improve", "ideas"];

export type RetroRow = {
  id: string;
  code: string;
  title: string;
  host_user_id: string;
  phase: Phase;
  timer_ends_at: string | null;
  timer_remaining_ms: number | null;
  timer_started: boolean;
  phase_durations: Partial<Record<Phase, number>>;
  show_authors: boolean;
  focused_card_id: string | null;
  created_at: string;
};

export type ParticipantRow = {
  id: string;
  retro_id: string;
  user_id: string;
  name: string;
  role: Role;
  created_at: string;
};

export type CardView = {
  id: string;
  column: Column;
  text: string;
  /** only returned for the caller's own cards (others' times could unmask authors) */
  created_at: string | null;
  author_participant_id: string | null;
  is_mine: boolean;
};

export type VoteRow = { id: string; card_id: string; participant_id: string; retro_id: string };

export type ActionItemRow = {
  id: string;
  retro_id: string;
  text: string;
  owner_text: string;
  owner_participant_id: string | null;
  due_date: string | null;
  position: number;
};

export type ActionItemView = ActionItemRow & { cardIds: string[] };
