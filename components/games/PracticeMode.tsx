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

      {/* Row on wider viewports (Previous — answer — Next), but a long
          answer (e.g. "Bophuthatswana", "Sahrawi Arab Democratic Republic")
          has no wrap opportunity wide enough to keep 2 fixed-width buttons
          plus the flex-1 answer box on one line at mobile widths, pushing
          Next off-screen (issue #49). Below `sm`, stack the answer full-width
          on top and the two buttons in their own row underneath it instead
          of shrinking/truncating anything — the buttons+answer wrapper uses
          `sm:contents` so its two button children rejoin the parent flex row
          at the `sm` breakpoint (ordered back to Previous/answer/Next via
          `sm:order-*`) rather than needing separate mobile/desktop markup. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="order-1 flex-1 break-words rounded-md border border-success bg-success/10 px-4 py-3 text-center text-lg font-bold text-success sm:order-2">
          {renderAnswer(item)}
        </div>
        <div className="order-2 grid grid-cols-2 gap-3 sm:contents">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            className="rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-40 sm:order-1"
          >
            ← Previous
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === order.length - 1}
            className="rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-muted disabled:opacity-40 sm:order-3"
          >
            Next →
          </button>
        </div>
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
