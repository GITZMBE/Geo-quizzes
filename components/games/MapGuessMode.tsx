"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { Leaderboard } from "@/components/Leaderboard";
import { GameResultActions } from "@/components/games/GameResultActions";
import type { UnofficialBorderFeature } from "@/lib/games/data";
import { useRoundGame } from "@/lib/games/useRoundGame";
import { getAutocompleteMatch } from "@/lib/games/text";

// A single region's outline is shown, filled in, zoomed to fit its own
// size (MapView's fitSize does this automatically once regionsData holds
// only the one target feature, the same trick CityStreetsMode already
// relies on for a per-city zoom) — type which one it is. Same round shape
// as FlagsMode (one full pass through `entities`, POINTS), just with a
// filled map shape instead of a flag image as the clue.
export function MapGuessMode({
  gameSlug,
  entities,
  modeSlug = "map",
}: {
  gameSlug: string;
  entities: UnofficialBorderFeature[];
  modeSlug?: string;
}) {
  const { game, mode, state, target, submitGuess, playAgain } = useRoundGame({
    gameSlug,
    modeSlug,
    items: entities,
    getId: (e) => e.properties.name,
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const byName = new Map(entities.map((e) => [e.properties.name, e]));
  const targetEntity = target ? byName.get(target) : undefined;
  const names = entities.map((e) => e.properties.name);

  const mapData = useMemo<UnofficialBorderFeature[]>(
    () => (targetEntity ? [targetEntity] : []),
    [targetEntity]
  );

  // A feature whose own longitude span is already >180° (Soviet Union's
  // Chukotka peninsula reaches past the antimeridian) blows up default
  // Mercator's fitSize bounding box to ~360° of longitude, squeezing the
  // real shape into a sliver — same root cause and same fix as MapView's
  // "pacific" projection for Oceania countries (see CLAUDE.md). Checked
  // per-target rather than hardcoded to one entity, since which entity (if
  // any) needs it can change as more border data is added.
  const projection = useMemo(() => {
    if (!targetEntity) return "mercator" as const;
    const polys =
      targetEntity.geometry.type === "Polygon"
        ? [targetEntity.geometry.coordinates]
        : targetEntity.geometry.coordinates;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const poly of polys as unknown as number[][][][]) {
      for (const ring of poly) {
        for (const [lng] of ring) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        }
      }
    }
    return maxLng - minLng > 180 ? ("pacific" as const) : ("mercator" as const);
  }, [targetEntity]);

  useEffect(() => {
    if (!state.lastResult && !state.finished) {
      inputRef.current?.focus();
    }
  }, [state.lastResult, state.finished]);

  function guess(answer: string) {
    submitGuess(answer, !!targetEntity && answer.toLowerCase() === targetEntity.properties.name.toLowerCase());
    setInput("");
  }

  function handleChange(value: string) {
    const match = getAutocompleteMatch(value, names);
    if (match && targetEntity && match.toLowerCase() === targetEntity.properties.name.toLowerCase()) {
      guess(match);
      return;
    }
    setInput(value);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {!state.finished ? (
        <>
          <div
            className={`rounded-lg border p-4 text-center text-lg font-medium transition-colors ${
              state.lastResult === "correct"
                ? "border-success bg-success/10 text-success"
                : state.lastResult === "wrong"
                  ? "border-error bg-error/10 text-error"
                  : "border-border bg-surface"
            }`}
          >
            {!state.lastResult ? (
              <>
                What is this?
                <span className="ml-3 text-sm text-muted-foreground">
                  ({state.index + 1}/{state.order.length}) · Score: {state.score}
                </span>
              </>
            ) : (
              <span>
                {state.lastResult === "correct" ? "Correct!" : "Not quite —"} that&apos;s{" "}
                <span className="font-bold">{targetEntity?.properties.name}</span>
              </span>
            )}
          </div>

          <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-lg border border-border">
            {targetEntity && (
              <MapView
                regionsData={mapData}
                projection={projection}
                fill={() =>
                  state.lastResult === "correct"
                    ? "rgba(34, 197, 94, 0.55)"
                    : state.lastResult === "wrong"
                      ? "rgba(239, 68, 68, 0.55)"
                      : "rgba(37, 99, 235, 0.55)"
                }
                stroke={() => "var(--foreground)"}
                strokeWidth={() => 1}
              />
            )}
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) guess(input.trim());
            }}
            disabled={!!state.lastResult}
            autoFocus
            placeholder="Type its name..."
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">
              {state.score} / {state.order.length}
            </p>
            <p className="text-muted-foreground">Correctly identified</p>
          </div>
          <GameResultActions onPlayAgain={playAgain} />
          <div className="w-full max-w-sm">
            <Leaderboard key={String(state.finished)} gameSlug={game.slug} mode={mode} currentScore={state.score} />
          </div>
        </div>
      )}
    </div>
  );
}
