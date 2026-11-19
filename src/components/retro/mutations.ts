"use client";

import { createBrowserClient } from "@/lib/supabase/client";
import type { Column } from "@/lib/domain/types";

type Res = { error: unknown | null };

export async function addCard(retroId: string, participantId: string, column: Column, text: string): Promise<Res> {
  return createBrowserClient()
    .from("cards")
    .insert({ retro_id: retroId, author_participant_id: participantId, column, text });
}

export async function updateCard(id: string, text: string): Promise<Res> {
  return createBrowserClient().from("cards").update({ text }).eq("id", id);
}

export async function deleteCard(id: string): Promise<Res> {
  return createBrowserClient().from("cards").delete().eq("id", id);
}

export async function addVote(retroId: string, cardId: string, participantId: string): Promise<Res> {
  return createBrowserClient().from("votes").insert({ retro_id: retroId, card_id: cardId, participant_id: participantId });
}

export async function removeVote(voteId: string): Promise<Res> {
  return createBrowserClient().from("votes").delete().eq("id", voteId);
}
