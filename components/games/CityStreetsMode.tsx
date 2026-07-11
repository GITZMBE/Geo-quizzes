"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { Leaderboard } from "@/components/Leaderboard";
import { GameResultActions } from "@/components/games/GameResultActions";
import type { CityStreetsFeature } from "@/lib/games/data";
import { useRoundGame } from "@/lib/games/useRoundGame";
import { useGameState } from "@/lib/state/useGameState";
import { getRoundState } from "@/lib/state/gameAtoms";
import { shuffle } from "@/lib/games/geo";
import { getAutocompleteMatch } from "@/lib/games/text";

const ROUND_SIZE = 5;

export function CityStreetsMode({
  gameSlug,
  modeSlug,
  cities,
}: {
  gameSlug: string;
  modeSlug: string;
  cities: CityStreetsFeature[];
}) {
  // Same "5 of a larger pool" override as RoadsMode: useRoundGame shuffles
  // ALL of `items`, with no built-in cap, so a stable subset is picked once
  // per mount here and playAgain (not useRoundGame's own) draws a fresh one.
  const [items, setItems] = useState(() => shuffle(cities).slice(0, ROUND_SIZE));

  const { game, mode, state, target, submitGuess, playAgain: resetForStaleItems } = useRoundGame({
    gameSlug,
    modeSlug,
    items,
    getId: (c) => c.properties.name,
  });
  // Same reason as RoadsMode: useRoundGame's own playAgain still runs for
  // its private submittedRef reset, but its reshuffle closes over this
  // render's stale `items`, so the fresh subset below overwrites it.
  const [, setRoundState] = useGameState(getRoundState(`${gameSlug}:${modeSlug}`));

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const byName = new Map(items.map((c) => [c.properties.name, c]));
  const targetCity = target ? byName.get(target) : undefined;
  const names = items.map((c) => c.properties.name);

  // Isolated on purpose — no background country/continent outline like
  // RoadsMode adds for Sweden. The whole point of this game is that the
  // street pattern is the *only* clue; any surrounding context (coastline,
  // borders, labels) would give away the city before the player has to
  // recognize the pattern itself.
  const mapData = useMemo<CityStreetsFeature[]>(() => (targetCity ? [targetCity] : []), [targetCity]);

  useEffect(() => {
    if (!state.lastResult && !state.finished) {
      inputRef.current?.focus();
    }
  }, [state.lastResult, state.finished]);

  function guess(answer: string) {
    submitGuess(answer, !!targetCity && answer.toLowerCase() === targetCity.properties.name.toLowerCase());
    setInput("");
  }

  function handleChange(value: string) {
    const match = getAutocompleteMatch(value, names);
    if (match && targetCity && match.toLowerCase() === targetCity.properties.name.toLowerCase()) {
      guess(match);
      return;
    }
    setInput(value);
  }

  function playAgain() {
    resetForStaleItems();
    const nextItems = shuffle(cities).slice(0, ROUND_SIZE);
    setItems(nextItems);
    setRoundState({
      order: shuffle(nextItems.map((c) => c.properties.name)),
      index: 0,
      score: 0,
      lastAnswer: null,
      lastResult: null,
      wrongGuesses: [],
      correctGuesses: [],
      finished: false,
    });
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
                Which city is this?
                <span className="ml-3 text-sm text-muted-foreground">
                  ({state.index + 1}/{state.order.length}) · Score: {state.score}
                </span>
              </>
            ) : (
              <span>
                {state.lastResult === "correct" ? "Correct!" : "Not quite —"} that&apos;s{" "}
                <span className="font-bold">{targetCity?.properties.name}</span>
              </span>
            )}
          </div>

          <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-lg border border-border">
            {targetCity && (
              <MapView
                regionsData={mapData}
                fill={() => "none"}
                stroke={() =>
                  state.lastResult === "correct"
                    ? "var(--success)"
                    : state.lastResult === "wrong"
                      ? "var(--error)"
                      : "var(--foreground)"
                }
                strokeWidth={() => 1.25}
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
            placeholder="Type the city name..."
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">
              {state.score} / {state.order.length}
            </p>
            <p className="text-muted-foreground">Cities correctly identified</p>
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
