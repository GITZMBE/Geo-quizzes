"use client";

import { useEffect, useState } from "react";
import { formatScoreValue } from "@/lib/games/scores";
import type { GameMode } from "@/lib/games/registry";

type LeaderboardEntry = {
  id: string;
  value: number;
  type: "POINTS" | "TIME_MS";
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
};

// Give this a `key` that changes (e.g. per finished run) if it needs to
// refetch — that remounts the component with fresh initial state instead of
// resetting state imperatively inside an effect.
export function Leaderboard({ gameSlug, mode }: { gameSlug: string; mode: GameMode }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/games/${gameSlug}/leaderboard?mode=${mode.slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEntries(data.top);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [gameSlug, mode.slug]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        Top 10 — {mode.name}
      </h3>
      {error && <p className="text-sm text-error">Couldn&apos;t load leaderboard.</p>}
      {!error && !entries && <p className="text-sm text-muted-foreground">Loading...</p>}
      {entries && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No scores yet — be the first!</p>
      )}
      {entries && entries.length > 0 && (
        <ol className="flex flex-col gap-1">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-5 text-muted-foreground">{i + 1}.</span>
                <span>{entry.user.name ?? "Anonymous"}</span>
              </span>
              <span className="font-medium">{formatScoreValue(entry.type, entry.value)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
