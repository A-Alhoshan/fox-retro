"use client";

import { useState } from "react";
import { Mascot } from "@/components/mascot/Mascot";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LocaleToggle } from "@/components/LocaleToggle";
import type { Mood } from "@/lib/domain/types";

const MOODS: Mood[] = ["happy", "wave", "jump", "focused", "nervous", "surprised", "excited", "sad", "celebrate"];

export function MascotGallery() {
  const [k, setK] = useState(0);
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl">Mascot moods</h1>
        <div className="flex gap-2">
          <button className="rounded-full border px-3 text-sm" onClick={() => setK((x) => x + 1)}>
            replay
          </button>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        {MOODS.map((m) => (
          <div key={`${m}-${k}`} className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6">
            <Mascot mood={m} size={128} />
            <span className="text-sm text-muted-foreground">{m}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
