import type { MessageKey } from "@/i18n/messages";
import { COLUMNS, type Column } from "./types";

export type SummaryData = {
  title: string;
  date: string;
  cards: { column: Column; text: string; votes: number }[];
  actions: { text: string; owner: string; dueDate: string | null; refs: string[] }[];
};

export function toMarkdown(s: SummaryData, t: (k: MessageKey) => string): string {
  const lines: string[] = [`# ${s.title}`, "", `_${s.date}_`, ""];
  for (const col of COLUMNS) {
    lines.push(`## ${t(`columns.${col}`)}`, "");
    const cards = s.cards.filter((c) => c.column === col).sort((a, b) => b.votes - a.votes);
    for (const c of cards) lines.push(`- ${c.text}${c.votes ? ` (${c.votes})` : ""}`);
    lines.push("");
  }
  lines.push(`## ${t("actions.title")}`, "");
  for (const a of s.actions) {
    let line = `- [ ] ${a.text}`;
    if (a.owner) line += ` — ${a.owner}`;
    if (a.dueDate) line += ` (${a.dueDate})`;
    if (a.refs.length) line += ` ↳ ${a.refs.join("; ")}`;
    lines.push(line);
  }
  return lines.join("\n") + "\n";
}
