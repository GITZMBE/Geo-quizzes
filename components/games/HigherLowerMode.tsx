"use client";

import { useEffect, useRef } from "react";
import { useGameState } from "@/lib/state/useGameState";
import { getHigherLowerState } from "@/lib/state/gameAtoms";
import { Leaderboard } from "@/components/Leaderboard";
import { GameResultActions } from "@/components/games/GameResultActions";
import type { CountryStat } from "@/lib/games/data";
import { submitScore } from "@/lib/games/scores";
import { getGame } from "@/lib/games/registry";
import { shuffle } from "@/lib/games/geo";

// Brief colored reveal after each guess before advancing — same timing
// convention as useRoundGame's feedbackDelayMs default.
const FEEDBACK_DELAY_MS = 1200;

export type HigherLowerStatKey = "population" | "area";

const STAT_CONFIG: Record<HigherLowerStatKey, { label: string; format: (n: number) => string }> = {
  population: { label: "Population", format: (n) => n.toLocaleString() },
  area: { label: "Area", format: (n) => `${n.toLocaleString()} km²` },
};

function pickTwoDistinctIds(countries: CountryStat[]): [string, string] {
  const [a, b] = shuffle(countries);
  return [a.id, b.id];
}

// Excludes every country already seen this run so the same pair doesn't
// resurface mid-streak; falls back to "everything except the current left"
// once the pool is exhausted (197 countries makes that edge case unlikely
// in practice, but a long enough streak could still hit it).
function pickNextId(countries: CountryStat[], seenIds: string[], excludeId: string): string | null {
  const unseen = countries.filter((c) => !seenIds.includes(c.id));
  const pool = unseen.length > 0 ? unseen : countries.filter((c) => c.id !== excludeId);
  return shuffle(pool)[0]?.id ?? null;
}

export function HigherLowerMode({
  gameSlug,
  modeSlug,
  countries,
  statKey,
}: {
  gameSlug: string;
  modeSlug: string;
  countries: CountryStat[];
  statKey: HigherLowerStatKey;
}) {
  const game = getGame(gameSlug)!;
  const mode = game.modes.find((m) => m.slug === modeSlug)!;
  const [state, setState] = useGameState(getHigherLowerState(`${gameSlug}:${modeSlug}`));
  const submittedRef = useRef(false);
  const config = STAT_CONFIG[statKey];

  const byId = new Map(countries.map((c) => [c.id, c]));

  useEffect(() => {
    if (state.leftId === null && countries.length >= 2) {
      const [leftId, rightId] = pickTwoDistinctIds(countries);
      setState({ leftId, rightId, seenIds: [leftId, rightId], score: 0, lastResult: null, finished: false });
    }
  }, [countries, state.leftId, setState]);

  // Same "brief feedback, then advance" shape as every other mode's round
  // transition — correct promotes right-to-left and draws a new right;
  // wrong ends the run (the streak-so-far is the final score).
  useEffect(() => {
    if (!state.lastResult) return;
    const timeout = setTimeout(() => {
      setState((prev) => {
        if (prev.lastResult === "wrong" || !prev.rightId) {
          return { ...prev, finished: true, lastResult: null };
        }
        const nextRightId = pickNextId(countries, prev.seenIds, prev.rightId);
        return {
          ...prev,
          leftId: prev.rightId,
          rightId: nextRightId,
          seenIds: nextRightId ? [...prev.seenIds, nextRightId] : prev.seenIds,
          score: prev.score + 1,
          lastResult: null,
        };
      });
    }, FEEDBACK_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [state.lastResult, setState, countries]);

  useEffect(() => {
    if (state.finished && !submittedRef.current) {
      submittedRef.current = true;
      submitScore(gameSlug, modeSlug, state.score).catch(() => {});
    }
  }, [state.finished, state.score, gameSlug, modeSlug]);

  const left = state.leftId ? byId.get(state.leftId) : undefined;
  const right = state.rightId ? byId.get(state.rightId) : undefined;

  function guess(direction: "higher" | "lower") {
    if (!left || !right || state.lastResult || state.finished) return;
    const leftValue = left[statKey];
    const rightValue = right[statKey];
    // A tie counts as correct either way — there's no "wrong" direction
    // when the values are equal.
    const correct =
      rightValue === leftValue || (direction === "higher" ? rightValue > leftValue : rightValue < leftValue);
    setState((prev) => ({ ...prev, lastResult: correct ? "correct" : "wrong" }));
  }

  function playAgain() {
    submittedRef.current = false;
    const [leftId, rightId] = pickTwoDistinctIds(countries);
    setState({ leftId, rightId, seenIds: [leftId, rightId], score: 0, lastResult: null, finished: false });
  }

  if (!left || !right) {
    return <p className="text-muted-foreground">Loading countries...</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      {!state.finished ? (
        <>
          <div className="text-center text-sm text-muted-foreground">
            Streak: <span className="font-bold text-foreground">{state.score}</span>
          </div>

          <div className="flex flex-1 items-center gap-4">
            <CountryCard
              country={left}
              statLabel={config.label}
              displayValue={config.format(left[statKey])}
              tone="neutral"
            />
            <span className="text-sm font-medium text-muted-foreground">vs</span>
            <CountryCard
              country={right}
              statLabel={config.label}
              displayValue={state.lastResult ? config.format(right[statKey]) : "?"}
              tone={state.lastResult === "correct" ? "correct" : state.lastResult === "wrong" ? "wrong" : "neutral"}
            />
          </div>

          {!state.lastResult ? (
            <div className="flex gap-3">
              <button
                onClick={() => guess("higher")}
                className="flex-1 rounded-md border border-border bg-surface py-4 text-lg font-medium hover:border-primary"
              >
                Higher ↑
              </button>
              <button
                onClick={() => guess("lower")}
                className="flex-1 rounded-md border border-border bg-surface py-4 text-lg font-medium hover:border-primary"
              >
                Lower ↓
              </button>
            </div>
          ) : (
            <div
              className={`rounded-lg border p-3 text-center font-medium ${
                state.lastResult === "correct"
                  ? "border-success bg-success/10 text-success"
                  : "border-error bg-error/10 text-error"
              }`}
            >
              {state.lastResult === "correct" ? "Correct!" : "Not quite — run over."}
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{state.score}</p>
            <p className="text-muted-foreground">Correct in a row</p>
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

function CountryCard({
  country,
  statLabel,
  displayValue,
  tone,
}: {
  country: CountryStat;
  statLabel: string;
  displayValue: string;
  tone: "neutral" | "correct" | "wrong";
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-3 rounded-lg border p-6 text-center transition-colors ${
        tone === "correct"
          ? "border-success bg-success/10"
          : tone === "wrong"
            ? "border-error bg-error/10"
            : "border-border bg-surface"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external flagcdn.com images, not worth Next/Image config for a fixed-size flag */}
      <img src={country.flagUrl} alt="" className="h-20 w-32 rounded-md object-cover shadow-sm" />
      <p className="text-lg font-bold">{country.name}</p>
      <div>
        <p className="text-sm text-muted-foreground">{statLabel}</p>
        <p className="text-2xl font-bold">{displayValue}</p>
      </div>
    </div>
  );
}
