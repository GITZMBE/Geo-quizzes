"use client";

import { useEffect, useRef, useState } from "react";
import { Leaderboard } from "@/components/Leaderboard";
import { GameResultActions } from "@/components/games/GameResultActions";
import type { CountryCoatOfArms } from "@/lib/games/data";
import { useRoundGame } from "@/lib/games/useRoundGame";
import { getAutocompleteMatch } from "@/lib/games/text";

export function CoatOfArmsMode({
  gameSlug,
  countries,
}: {
  gameSlug: string;
  countries: CountryCoatOfArms[];
}) {
  const { game, mode, state, target, submitGuess, playAgain } = useRoundGame({
    gameSlug,
    modeSlug: "coat-of-arms",
    items: countries,
    getId: (c) => c.name,
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const byName = new Map(countries.map((c) => [c.name, c]));
  const targetCountry = target ? byName.get(target) : undefined;
  const names = countries.map((c) => c.name);

  // The input is disabled during the correct/wrong feedback window, which
  // forces the browser to blur it — refocus once it re-enables for the
  // next round instead of leaving the user to click back into it.
  useEffect(() => {
    if (!state.lastResult && !state.finished) {
      inputRef.current?.focus();
    }
  }, [state.lastResult, state.finished]);

  function guess(answer: string) {
    submitGuess(answer, answer.toLowerCase() === target?.toLowerCase());
    setInput("");
  }

  function handleChange(value: string) {
    const match = getAutocompleteMatch(value, names);
    // Only auto-submit when the unique match is the actual correct answer —
    // otherwise a prefix that happens to uniquely identify some other
    // country would lock in a wrong guess before the user finishes typing
    // (or notices the mistake). A wrong guess still requires Enter.
    if (match && target && match.toLowerCase() === target.toLowerCase()) {
      guess(match);
      return;
    }
    setInput(value);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
      {!state.finished ? (
        <>
          <div
            className={`w-full rounded-lg border p-4 text-center text-lg font-medium transition-colors ${
              state.lastResult === "correct"
                ? "border-success bg-success/10 text-success"
                : state.lastResult === "wrong"
                  ? "border-error bg-error/10 text-error"
                  : "border-border bg-surface"
            }`}
          >
            {!state.lastResult ? (
              <>
                Which country does this coat of arms belong to?
                <span className="ml-3 text-sm text-muted-foreground">
                  ({state.index + 1}/{state.order.length}) · Score: {state.score}
                </span>
              </>
            ) : (
              <span>
                {state.lastResult === "correct" ? "Correct!" : "Not quite —"} that&apos;s{" "}
                <span className="font-bold">{target}</span>
              </span>
            )}
          </div>

          {targetCountry && (
            // eslint-disable-next-line @next/next/no-img-element -- external Wikimedia Commons images, not worth Next/Image config for a fixed-size image
            <img
              src={targetCountry.coatOfArmsUrl}
              alt="Coat of arms to guess"
              // object-contain (not FlagsMode's object-cover) — coats of
              // arms are a mix of aspect ratios, often on a transparent
              // background, so cropping to fill a wide rectangle chops off
              // real content in a way that never happens with a flag.
              className="h-40 w-64 rounded-md border border-border bg-white object-contain p-2 shadow-sm"
            />
          )}

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) guess(input.trim());
            }}
            disabled={!!state.lastResult}
            autoFocus
            placeholder="Type the country name..."
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">
              {state.score} / {state.order.length}
            </p>
            <p className="text-muted-foreground">Coats of arms correctly identified</p>
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
