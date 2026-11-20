import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider } from "@/i18n/locale";
import type { RetroData } from "@/components/retro/useRetro";
import type { CardView, ParticipantRow, Phase, Role, VoteRow } from "@/lib/domain/types";

const insert = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    from: () => ({ insert, delete: () => ({ eq: async () => ({ error: null }) }), update: () => ({ eq: async () => ({ error: null }) }) }),
  }),
}));
vi.mock("@/app/r/[code]/host-actions", () => ({ setFocusedCard: vi.fn(async () => ({ ok: true })) }));

import { Board } from "@/components/retro/Board";

const person = (id: string, name: string, role: Role = "team"): ParticipantRow => ({
  id,
  name,
  role,
  retro_id: "r1",
  user_id: `u-${id}`,
  created_at: "",
});
const card = (id: string, column: CardView["column"], text: string, o: Partial<CardView> = {}): CardView => ({
  id,
  column,
  text,
  created_at: "",
  author_participant_id: null,
  is_mine: false,
  ...o,
});

function data(phase: Phase, o: Partial<RetroData> = {}, myRole: Role = "team"): RetroData {
  const me = person("pA", "Alice", myRole);
  return {
    status: "ready",
    userId: "u-pA",
    retro: {
      id: "r1",
      code: "ABC234",
      title: "T",
      host_user_id: "u-host",
      phase,
      timer_ends_at: null,
      timer_remaining_ms: null,
      timer_started: false,
      phase_durations: {},
      show_authors: false,
      votes_per_person: 3,
      focused_card_id: null,
      created_at: "",
    },
    me,
    isHost: false,
    participants: [me, person("pB", "Bob")],
    online: new Set(),
    cards: [],
    counts: {},
    myVotes: [],
    totals: {},
    actions: [],
    offsetMs: 0,
    arrivals: 0,
    notify: vi.fn(),
    refresh: vi.fn(),
    ...o,
  };
}

const renderBoard = (d: RetroData) =>
  render(
    <LocaleProvider initial="en">
      <Board data={d} />
    </LocaleProvider>,
  );

beforeEach(() => insert.mockClear());

describe("Board — writing", () => {
  it.each<Role>(["team", "product_owner", "scrum_master"])("shows the composer for %s", (role) => {
    renderBoard(data("writing", {}, role));
    expect(screen.getAllByPlaceholderText("Type a card…")).toHaveLength(3);
  });

  it("hides the composer for a viewer", () => {
    renderBoard(data("writing", {}, "viewer"));
    expect(screen.queryByPlaceholderText("Type a card…")).toBeNull();
  });

  it("cannot submit an empty card", async () => {
    renderBoard(data("writing"));
    const col = screen.getByTestId("column-went_well");
    expect(within(col).getByRole("button", { name: "Add card" })).toBeDisabled();
    await userEvent.type(within(col).getByPlaceholderText("Type a card…"), "   ");
    expect(within(col).getByRole("button", { name: "Add card" })).toBeDisabled();
  });

  it("adds a trimmed card and notifies", async () => {
    const d = data("writing");
    renderBoard(d);
    const col = screen.getByTestId("column-ideas");
    await userEvent.type(within(col).getByPlaceholderText("Type a card…"), "  Pair more ");
    await userEvent.click(within(col).getByRole("button", { name: "Add card" }));
    expect(insert).toHaveBeenCalledWith({ retro_id: "r1", author_participant_id: "pA", column: "ideas", text: "Pair more" });
    expect(d.notify).toHaveBeenCalledWith("cards_changed");
  });

  it("shows only own cards plus 'X wrote N' chips for others", () => {
    renderBoard(
      data("writing", {
        cards: [card("c1", "went_well", "Mine", { is_mine: true, author_participant_id: "pA" })],
        counts: { pA: 1, pB: 3 },
      }),
    );
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByText("Bob wrote 3")).toBeInTheDocument();
  });
});

describe("Board — reveal", () => {
  it("renders all cards and hides authors when null", () => {
    renderBoard(
      data("reveal", {
        cards: [
          card("c1", "went_well", "Demos"),
          card("c2", "to_improve", "Flaky CI", { author_participant_id: "pB" }),
        ],
      }),
    );
    expect(screen.getByText("Demos")).toBeInTheDocument();
    const c1 = screen.getByText("Demos").closest("[data-card]")!;
    expect(within(c1 as HTMLElement).queryByText("Bob")).toBeNull();
    const c2 = screen.getByText("Flaky CI").closest("[data-card]")!;
    expect(within(c2 as HTMLElement).getByText("Bob")).toBeInTheDocument();
  });

  it("card text uses dir=auto", () => {
    renderBoard(data("reveal", { cards: [card("c1", "ideas", "نشتغل بالثنائي")] }));
    expect(screen.getByText("نشتغل بالثنائي").getAttribute("dir")).toBe("auto");
  });
});

describe("Board — voting", () => {
  const votes = (n: number): VoteRow[] =>
    Array.from({ length: n }, (_, i) => ({ id: `v${i}`, card_id: "c1", participant_id: "pA", retro_id: "r1" }));

  it("shows votes left and no totals", () => {
    renderBoard(data("voting", { cards: [card("c1", "went_well", "Demos")], myVotes: votes(1), totals: { c1: 9 } }));
    expect(screen.getByText("2 votes left")).toBeInTheDocument();
    expect(screen.queryByText("9 votes")).toBeNull();
  });

  it("uses the host's vote count", () => {
    const d = data("voting", { cards: [card("c1", "went_well", "Demos")], myVotes: votes(3) });
    d.retro!.votes_per_person = 5;
    renderBoard(d);
    expect(screen.getByText("2 votes left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vote" })).not.toBeDisabled();
  });

  it("keeps votes but blocks new ones when the count is lowered", () => {
    const d = data("voting", { cards: [card("c1", "went_well", "Demos")], myVotes: votes(4) });
    d.retro!.votes_per_person = 2;
    renderBoard(d);
    expect(screen.getByText("0 votes left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vote" })).toBeDisabled();
  });

  it("disables voting at 0 left", () => {
    renderBoard(data("voting", { cards: [card("c1", "went_well", "Demos")], myVotes: votes(3) }));
    expect(screen.getByRole("button", { name: "Vote" })).toBeDisabled();
  });

  it("disables voting for a viewer", () => {
    renderBoard(data("voting", { cards: [card("c1", "went_well", "Demos")] }, "viewer"));
    expect(screen.getByRole("button", { name: "Vote" })).toBeDisabled();
  });

  it("casts a vote and notifies", async () => {
    const d = data("voting", { cards: [card("c1", "went_well", "Demos")] });
    renderBoard(d);
    await userEvent.click(screen.getByRole("button", { name: "Vote" }));
    expect(insert).toHaveBeenCalledWith({ retro_id: "r1", card_id: "c1", participant_id: "pA" });
    expect(d.notify).toHaveBeenCalledWith("votes_changed");
  });
});

describe("Board — discussion", () => {
  const cards = [card("c1", "went_well", "Low"), card("c2", "went_well", "High")];

  it("sorts cards by totals desc", () => {
    renderBoard(data("discussion", { cards, totals: { c1: 1, c2: 4 } }));
    const col = screen.getByTestId("column-went_well");
    const texts = within(col).getAllByTestId("card-text").map((n) => n.textContent);
    expect(texts).toEqual(["High", "Low"]);
  });

  it("only the host sees Focus", () => {
    const { unmount } = renderBoard(data("discussion", { cards, totals: {} }));
    expect(screen.queryByRole("button", { name: "Focus" })).toBeNull();
    unmount();
    renderBoard(data("discussion", { cards, totals: {}, isHost: true }));
    expect(screen.getAllByRole("button", { name: "Focus" })).toHaveLength(2);
  });

  it("marks the focused card", () => {
    const d = data("discussion", { cards, totals: {} });
    d.retro!.focused_card_id = "c2";
    renderBoard(d);
    expect(screen.getByText("High").closest("[data-card]")!.getAttribute("data-focused")).toBe("true");
    expect(screen.getByText("Low").closest("[data-card]")!.getAttribute("data-focused")).toBe("false");
  });
});
