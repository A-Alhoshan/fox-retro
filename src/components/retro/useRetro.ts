"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserClient } from "@/lib/supabase/client";
import { clockOffset } from "@/lib/domain/timer";
import type {
  ActionItemRow,
  ActionItemView,
  CardView,
  ParticipantRow,
  RetroRow,
  VoteRow,
} from "@/lib/domain/types";

export type RetroStatus = "loading" | "not_found" | "needs_join" | "ready" | "error";
export type RetroEvent = "cards_changed" | "votes_changed";

export type RetroData = {
  status: RetroStatus;
  userId: string | null;
  retro: RetroRow | null;
  me: ParticipantRow | null;
  isHost: boolean;
  participants: ParticipantRow[];
  online: Set<string>;
  cards: CardView[];
  counts: Record<string, number>;
  myVotes: VoteRow[];
  totals: Record<string, number>;
  actions: ActionItemView[];
  offsetMs: number;
  /** increments every time someone new joins (drives the mascot jump) */
  arrivals: number;
  notify: (e: RetroEvent) => void;
  refresh: () => Promise<void>;
};

const toMap = (rows: { n: number }[] | null, key: string) =>
  Object.fromEntries((rows ?? []).map((r) => [(r as Record<string, unknown>)[key] as string, r.n]));

export function useRetro(code: string): RetroData {
  const supabase = createBrowserClient();
  const [status, setStatus] = useState<RetroStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [retroId, setRetroId] = useState<string | null>(null);
  const [retro, setRetro] = useState<RetroRow | null>(null);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [cards, setCards] = useState<CardView[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<VoteRow[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [actions, setActions] = useState<ActionItemView[]>([]);
  const [offsetMs, setOffsetMs] = useState(0);
  const [arrivals, setArrivals] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const knownIds = useRef<Set<string> | null>(null);
  const phaseRef = useRef<string | null>(null);

  const me = participants.find((p) => p.user_id === userId) ?? null;
  const isHost = !!retro && !!userId && retro.host_user_id === userId;

  // ---------- fetchers ----------
  const fetchRetro = useCallback(
    async (id: string) => {
      const { data } = await supabase.from("retros").select("*").eq("id", id).maybeSingle();
      if (data) setRetro(data as RetroRow);
      return data as RetroRow | null;
    },
    [supabase],
  );

  const fetchParticipants = useCallback(
    async (id: string) => {
      const { data } = await supabase.from("participants").select("*").eq("retro_id", id).order("created_at");
      const rows = (data ?? []) as ParticipantRow[];
      if (knownIds.current) {
        const fresh = rows.filter((p) => !knownIds.current!.has(p.id));
        if (fresh.length) setArrivals((n) => n + fresh.length);
      }
      knownIds.current = new Set(rows.map((p) => p.id));
      setParticipants(rows);
      return rows;
    },
    [supabase],
  );

  const fetchCards = useCallback(
    async (id: string) => {
      const [c, n] = await Promise.all([
        supabase.rpc("get_cards", { p_retro: id }),
        supabase.rpc("get_card_counts", { p_retro: id }),
      ]);
      setCards((c.data ?? []) as CardView[]);
      setCounts(toMap(n.data, "participant_id"));
    },
    [supabase],
  );

  const fetchVotes = useCallback(
    async (id: string) => {
      const [v, tot] = await Promise.all([
        supabase.from("votes").select("*").eq("retro_id", id),
        supabase.rpc("get_vote_totals", { p_retro: id }),
      ]);
      setMyVotes((v.data ?? []) as VoteRow[]);
      setTotals(toMap(tot.data, "card_id"));
    },
    [supabase],
  );

  const fetchActions = useCallback(
    async (id: string) => {
      const [items, refs] = await Promise.all([
        supabase.from("action_items").select("*").eq("retro_id", id).order("position").order("created_at"),
        supabase.from("action_item_refs").select("action_item_id, card_id").eq("retro_id", id),
      ]);
      const byItem = new Map<string, string[]>();
      for (const r of (refs.data ?? []) as { action_item_id: string; card_id: string }[]) {
        byItem.set(r.action_item_id, [...(byItem.get(r.action_item_id) ?? []), r.card_id]);
      }
      setActions(((items.data ?? []) as ActionItemRow[]).map((a) => ({ ...a, cardIds: byItem.get(a.id) ?? [] })));
    },
    [supabase],
  );

  const fetchAll = useCallback(
    async (id: string) => {
      await Promise.all([fetchRetro(id), fetchParticipants(id), fetchCards(id), fetchVotes(id), fetchActions(id)]);
    },
    [fetchRetro, fetchParticipants, fetchCards, fetchVotes, fetchActions],
  );

  // ---------- bootstrap ----------
  const bootstrap = useCallback(async () => {
    try {
      let { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) throw error;
        s = (await supabase.auth.getSession()).data;
      }
      const uid = s.session!.user.id;
      setUserId(uid);

      const sent = Date.now();
      const { data: serverNow } = await supabase.rpc("server_now");
      if (serverNow) setOffsetMs(clockOffset(serverNow as string, sent, Date.now()));

      const { data: found } = await supabase.rpc("get_retro_by_code", { p_code: code });
      const row = (found as { id: string }[] | null)?.[0];
      if (!row) return setStatus("not_found");
      setRetroId(row.id);

      const [r, people] = await Promise.all([fetchRetro(row.id), fetchParticipants(row.id)]);
      if (r) phaseRef.current = `${r.phase}|${r.show_authors}`;
      const joined = people.some((p) => p.user_id === uid);
      if (!joined) return setStatus("needs_join");
      await Promise.all([fetchCards(row.id), fetchVotes(row.id), fetchActions(row.id)]);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, [supabase, code, fetchRetro, fetchParticipants, fetchCards, fetchVotes, fetchActions]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // ---------- realtime ----------
  useEffect(() => {
    if (status !== "ready" || !retroId || !me) return;
    const id = retroId;
    const filter = `retro_id=eq.${id}`;
    const ch = supabase
      .channel(`retro:${id}`, { config: { presence: { key: me.id }, broadcast: { self: false } } })
      .on("postgres_changes", { event: "*", schema: "public", table: "retros", filter: `id=eq.${id}` }, (p) => {
        const next = p.new as RetroRow;
        if (!next?.id) return;
        setRetro(next);
        const key = `${next.phase}|${next.show_authors}`;
        if (phaseRef.current !== key) {
          phaseRef.current = key;
          fetchCards(id);
          fetchVotes(id);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter }, () =>
        fetchParticipants(id),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "action_items", filter }, () => fetchActions(id))
      .on("postgres_changes", { event: "*", schema: "public", table: "action_item_refs", filter }, () =>
        fetchActions(id),
      )
      .on("broadcast", { event: "cards_changed" }, () => fetchCards(id))
      .on("broadcast", { event: "votes_changed" }, () => fetchVotes(id))
      .on("presence", { event: "sync" }, () => setOnline(new Set(Object.keys(ch.presenceState()))))
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          ch.track({ at: Date.now() });
          fetchAll(id); // catch up after (re)connect
        }
      });
    channelRef.current = ch;
    return () => {
      channelRef.current = null;
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, retroId, me?.id]);

  // refetch everything when the tab wakes up
  useEffect(() => {
    if (!retroId || status !== "ready") return;
    const onVis = () => document.visibilityState === "visible" && fetchAll(retroId);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [retroId, status, fetchAll]);

  const notify = useCallback(
    (e: RetroEvent) => {
      if (!retroId) return;
      if (e === "cards_changed") fetchCards(retroId);
      else fetchVotes(retroId);
      channelRef.current?.send({ type: "broadcast", event: e, payload: {} });
    },
    [retroId, fetchCards, fetchVotes],
  );

  const refresh = useCallback(async () => {
    setStatus("loading");
    await bootstrap();
  }, [bootstrap]);

  return {
    status,
    userId,
    retro,
    me,
    isHost,
    participants,
    online,
    cards,
    counts,
    myVotes,
    totals,
    actions,
    offsetMs,
    arrivals,
    notify,
    refresh,
  };
}
