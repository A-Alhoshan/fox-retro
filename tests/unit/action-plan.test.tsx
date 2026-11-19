import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/i18n/locale";
import type { RetroData } from "@/components/retro/useRetro";
import type { ActionItemView, CardView, ParticipantRow, Phase } from "@/lib/domain/types";

const createActionItem = vi.fn(async () => ({ id: "a9" }));
vi.mock("@/app/r/[code]/host-actions", () => ({
  createActionItem: (...a: unknown[]) => createActionItem(...(a as [])),
  updateActionItem: vi.fn(async () => ({ ok: true })),
  deleteActionItem: vi.fn(async () => ({ ok: true })),
  reorderActionItems: vi.fn(async () => ({ ok: true })),
  setFocusedCard: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/supabase/client", () => ({ createBrowserClient: () => ({}) }));
const buildDocx = vi.fn(async (_m: { title: string; sections: { heading: string }[] }) => new Blob(["docx"]));
vi.mock("@/lib/export/docx", () => ({ buildDocx: (m: never) => buildDocx(m) }));

import { ActionPlan } from "@/components/retro/ActionPlan";
import { ActionItemEditor } from "@/components/retro/ActionItemEditor";
import { Summary } from "@/components/retro/Summary";

const person = (id: string, name: string): ParticipantRow => ({
  id,
  name,
  role: "team",
  retro_id: "r1",
  user_id: `u-${id}`,
  created_at: "",
});
const card = (id: string, column: CardView["column"], text: string): CardView => ({
  id,
  column,
  text,
  created_at: "",
  author_participant_id: null,
  is_mine: false,
});
const people = [person("pA", "Alice"), person("pB", "Bob")];
const cards = [card("c1", "to_improve", "Flaky CI"), card("c2", "went_well", "Demos"), card("c3", "ideas", "Pairing")];
const item: ActionItemView = {
  id: "a1",
  retro_id: "r1",
  text: "Fix CI",
  owner_text: "Bob",
  owner_participant_id: "pB",
  due_date: "2026-11-26",
  position: 0,
  cardIds: ["c1"],
};

function data(phase: Phase, o: Partial<RetroData> = {}): RetroData {
  return {
    status: "ready",
    userId: "u-pA",
    retro: {
      id: "r1",
      code: "ABC234",
      title: "Sprint 24",
      host_user_id: "u-pA",
      phase,
      timer_ends_at: null,
      timer_remaining_ms: null,
      timer_started: false,
      phase_durations: {},
      show_authors: false,
      focused_card_id: null,
      created_at: "2026-11-19T10:00:00Z",
    },
    me: people[0],
    isHost: true,
    participants: people,
    online: new Set(),
    cards,
    counts: {},
    myVotes: [],
    totals: { c1: 3, c2: 1 },
    actions: [item],
    offsetMs: 0,
    arrivals: 0,
    notify: vi.fn(),
    refresh: vi.fn(),
    ...o,
  };
}

const wrap = (ui: React.ReactNode) => render(<LocaleProvider initial="en">{ui}</LocaleProvider>);

beforeEach(() => createActionItem.mockClear());

describe("ActionPlan", () => {
  it("only the host gets the Add action editor", () => {
    const { unmount } = wrap(<ActionPlan data={data("action_plan", { isHost: false })} />);
    expect(screen.queryByRole("button", { name: "Add action" })).toBeNull();
    unmount();
    wrap(<ActionPlan data={data("action_plan")} />);
    expect(screen.getByRole("button", { name: "Add action" })).toBeInTheDocument();
  });

  it("deleting an action refreshes everyone (realtime can't filter deletes)", async () => {
    const d = data("action_plan");
    wrap(<ActionPlan data={d} />);
    await userEvent.click(within(screen.getByTestId("action-a1")).getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(d.notify).toHaveBeenCalledWith("actions_changed"));
  });

  it("creating an action notifies too", async () => {
    const d = data("action_plan");
    wrap(<ActionPlan data={d} />);
    await userEvent.type(screen.getByLabelText("What will we do?"), "New one");
    await userEvent.click(screen.getByRole("button", { name: "Add action" }));
    await vi.waitFor(() => expect(d.notify).toHaveBeenCalledWith("actions_changed"));
  });

  it("shows each item with its ref chips; clicking a chip highlights the card", async () => {
    wrap(<ActionPlan data={data("action_plan")} />);
    const row = screen.getByTestId("action-a1");
    const chip = within(row).getByRole("button", { name: /Flaky CI/ });
    await userEvent.click(chip);
    const target = document.getElementById("card-c1")!;
    expect(target.getAttribute("data-highlighted")).toBe("true");
  });
});

describe("ActionItemEditor", () => {
  it("lists participants for the owner and accepts free text", async () => {
    const onSubmit = vi.fn(async () => true);
    wrap(<ActionItemEditor participants={people} cards={cards} onSubmit={onSubmit} />);
    const owner = screen.getByLabelText("Owner");
    const list = document.getElementById(owner.getAttribute("list")!)!;
    expect([...list.querySelectorAll("option")].map((o) => o.value)).toEqual(["Alice", "Bob"]);
    await userEvent.type(screen.getByLabelText("What will we do?"), "Write runbook");
    await userEvent.type(owner, "External team");
    await userEvent.click(screen.getByRole("button", { name: "Add action" }));
    expect(onSubmit).toHaveBeenCalledWith({
      text: "Write runbook",
      ownerText: "External team",
      ownerParticipantId: null,
      dueDate: null,
      cardIds: [],
    });
  });

  it("maps a participant name to their id", async () => {
    const onSubmit = vi.fn(async () => true);
    wrap(<ActionItemEditor participants={people} cards={cards} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("What will we do?"), "x");
    await userEvent.type(screen.getByLabelText("Owner"), "Bob");
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-12-01" } });
    await userEvent.click(screen.getByRole("button", { name: "Add action" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ownerParticipantId: "pB", dueDate: "2026-12-01" }));
  });

  it("links several cards as chips", async () => {
    const onSubmit = vi.fn(async () => true);
    wrap(<ActionItemEditor participants={people} cards={cards} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Link cards" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Flaky CI/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Pairing/ }));
    const chips = screen.getByTestId("ref-chips");
    expect(within(chips).getByText("Flaky CI")).toBeInTheDocument();
    expect(within(chips).getByText("Pairing")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("What will we do?"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Add action" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ cardIds: ["c1", "c3"] }));
  });

  it("can be prefilled with a ref (Make action)", () => {
    wrap(<ActionItemEditor participants={people} cards={cards} initialCardIds={["c2"]} onSubmit={vi.fn()} />);
    expect(within(screen.getByTestId("ref-chips")).getByText("Demos")).toBeInTheDocument();
  });

  it("does not submit empty text", async () => {
    const onSubmit = vi.fn();
    wrap(<ActionItemEditor participants={people} cards={cards} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Add action" })).toBeDisabled();
  });
});

describe("Summary", () => {
  it("does not crash on an unparseable created_at", () => {
    const d = data("summary");
    d.retro!.created_at = "";
    wrap(<Summary data={d} celebrate={false} />);
    expect(screen.getByText("Sprint 24")).toBeInTheDocument();
  });

  it("downloads an English Word file named after the retro", async () => {
    URL.createObjectURL = vi.fn(() => "blob:x");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    wrap(<Summary data={data("summary")} celebrate={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Download Word" }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(buildDocx.mock.calls[0][0].title).toBe("Sprint 24");
    expect(buildDocx.mock.calls[0][0].sections[0].heading).toBe("What went well");
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe("sprint-24-retro-2026-11-19.docx");
  });

  it("tells the user when the Word file can't be built", async () => {
    buildDocx.mockRejectedValueOnce(new Error("ChunkLoadError"));
    wrap(<Summary data={data("summary")} celebrate={false} />);
    await userEvent.click(screen.getByRole("button", { name: "Download Word" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't build the file");
    expect(screen.getByRole("button", { name: "Download Word" })).not.toBeDisabled();
  });

  it("renders actions with refs and copies Markdown", async () => {
    const writeText = vi.fn(async (_s: string) => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    wrap(<Summary data={data("summary")} />);
    const row = screen.getByTestId("summary-action-a1");
    expect(within(row).getByText("Fix CI")).toBeInTheDocument();
    expect(within(row).getByText(/Flaky CI/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    const md = writeText.mock.calls[0][0] as string;
    expect(md).toContain("# Sprint 24");
    expect(md).toContain("- [ ] Fix CI — Bob (26 Nov 2026) ↳ Flaky CI");
  });
});
