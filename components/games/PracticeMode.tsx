"use client";

import { useState } from "react";
import Link from "next/link";
import { shuffle } from "@/lib/games/geo";

// Generic "browse every question with its answer shown" review mode (issue
// #12) — shared across every game rather than one-off per game/mode, since
// the shape is identical regardless of what the "question" actually looks
// like (a flag, a highlighted map region, a coat of arms, a road). No
// score, no timer, no leaderboard, no persisted round state: unlike
// useRoundGame's modes this is meant to be revisited freely, so a fresh
// shuffle each mount (not restored from a previous session) is the right
// behavior, not a bug. The answer renders immediately alongside the
// question (issue #19) — practice is for review, not a per-question quiz,
// so there's no reveal gate to click through.
export function PracticeMode<T>({
  items,
  renderQuestion,
  renderAnswer,
}: {
  items: T[];
  renderQuestion: (item: T) => React.ReactNode;
  renderAnswer: (item: T) => React.ReactNode;
}) {
  const [order] = useState(() => shuffle(items));
  const [index, setIndex] = useState(0);

  const item = order[index];
  if (!item) return null;

  function go(delta: number) {
    setIndex((i) => Math.min(order.length - 1, Math.max(0, i + delta)));
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="rounded-lg border border-border bg-surface p-4 text-center text-sm text-muted-foreground">
        Practice — browse at your own pace, no score · {index + 1} / {order.length}
      </div>

      <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-lg border border-border">
        {renderQuestion(item)}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          ← Previous
        </button>
        <div className="flex-1 rounded-md border border-success bg-success/10 px-4 py-3 text-center text-lg font-bold text-success">
          {renderAnswer(item)}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === order.length - 1}
          className="rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-40"
        >
          Next →
        </button>
      </div>

      {index === order.length - 1 && (
        <div className="flex justify-center">
          <Link href="/games" className="rounded-md border border-border px-6 py-3 font-medium hover:bg-surface">
            Back to games
          </Link>
        </div>
      )}
    </div>
  );
}
