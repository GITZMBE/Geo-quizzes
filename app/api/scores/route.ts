import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGame } from "@/lib/games/registry";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { gameSlug, mode, value } = body as {
    gameSlug?: string;
    mode?: string;
    value?: number;
  };

  const game = gameSlug ? getGame(gameSlug) : undefined;
  const modeDef = game?.modes.find((m) => m.slug === mode);

  if (!game || !modeDef || typeof value !== "number") {
    return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
  }

  // Server-side plausibility check (issue #32) — the client is otherwise
  // free to POST any number here, so without this a player could submit an
  // arbitrary/negative/absurd score straight onto a public leaderboard
  // without playing. A single blanket ceiling/floor rather than a per-mode
  // max: every POINTS mode here tops out in the low thousands at most (flat
  // +1-per-correct-answer modes cap at a few hundred items; the highest,
  // proximity scoring, caps at 5000/round via `proximityScore` for at most a
  // handful of rounds), so 100000 catches obvious abuse with generous
  // headroom without needing a fragile per-mode table across ~20 games. A
  // TIME_MS floor of 1 second rules out an impossible instant-finish for
  // every "type them all" mode, which requires typing 100+ entries.
  const MAX_PLAUSIBLE_SCORE = 100000;
  const MIN_PLAUSIBLE_TIME_MS = 1000;

  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
  }
  if (modeDef.scoreType === "POINTS" && value > MAX_PLAUSIBLE_SCORE) {
    return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
  }
  if (modeDef.scoreType === "TIME_MS" && value < MIN_PLAUSIBLE_TIME_MS) {
    return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
  }

  const gameRow = await prisma.game.upsert({
    where: { slug: game.slug },
    update: {},
    create: { slug: game.slug, name: game.name },
  });

  const score = await prisma.score.create({
    data: {
      userId: session.user.id,
      gameId: gameRow.id,
      mode: modeDef.slug,
      type: modeDef.scoreType,
      value,
    },
  });

  return NextResponse.json({ score }, { status: 201 });
}
