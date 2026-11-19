import { COLUMNS, type ActionItemView, type CardView, type Column, type ParticipantRow, type RetroRow, type Role } from "./types";

/** What the final retro document (Word / Markdown) is built from. Always English, never card authors. */
export type ExportInput = {
  retro: RetroRow;
  participants: ParticipantRow[];
  cards: CardView[];
  totals: Record<string, number>;
  actions: ActionItemView[];
};

type Heading = "What went well" | "What could be improved" | "Ideas";

export type ExportModel = {
  title: string;
  dateLabel: string;
  isoDate: string;
  facilitator: string | null;
  participants: { name: string; role: string }[];
  stats: { participants: number; cards: number; votes: number; actions: number };
  sections: { heading: Heading; items: { text: string; votes: number }[] }[];
  actions: { text: string; owner: string; due: string | null; from: string[] }[];
};

const HEADINGS: Record<Column, Heading> = {
  went_well: "What went well",
  to_improve: "What could be improved",
  ideas: "Ideas",
};

const ROLES: Record<Role, string> = {
  team: "Team",
  product_owner: "PO",
  scrum_master: "Scrum Master",
  viewer: "Viewer",
};

const FROM_MAX = 60;

export const hasArabic = (s: string): boolean => /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s);

/** "2026-11-27" or an ISO timestamp → "27 Nov 2026" (UTC, so it never shifts a day) */
function formatDate(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

const cut = (s: string) => (s.length > FROM_MAX ? s.slice(0, FROM_MAX - 1) + "…" : s);

export function buildExport(i: ExportInput): ExportModel {
  const byId = new Map(i.participants.map((p) => [p.id, p]));
  const cardText = new Map(i.cards.map((c) => [c.id, c.text]));
  const votes = (id: string) => i.totals[id] ?? 0;

  return {
    title: i.retro.title,
    dateLabel: formatDate(i.retro.created_at),
    isoDate: i.retro.created_at.slice(0, 10),
    facilitator: i.participants.find((p) => p.user_id === i.retro.host_user_id)?.name ?? null,
    participants: i.participants.map((p) => ({ name: p.name, role: ROLES[p.role] })),
    stats: {
      participants: i.participants.length,
      cards: i.cards.length,
      votes: Object.values(i.totals).reduce((a, b) => a + b, 0),
      actions: i.actions.length,
    },
    sections: COLUMNS.map((col) => ({
      heading: HEADINGS[col],
      items: i.cards
        .filter((c) => c.column === col)
        .map((c) => ({ text: c.text, votes: votes(c.id) }))
        .sort((a, b) => b.votes - a.votes),
    })),
    actions: i.actions.map((a) => ({
      text: a.text,
      owner: (a.owner_participant_id && byId.get(a.owner_participant_id)?.name) || a.owner_text,
      due: a.due_date ? formatDate(a.due_date) : null,
      from: a.cardIds.map((id) => cardText.get(id)).filter((t): t is string => !!t).map(cut),
    })),
  };
}

export function exportFileName(m: ExportModel): string {
  const slug = m.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "retro"}-retro-${m.isoDate}.docx`;
}
