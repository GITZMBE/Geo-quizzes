"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCountryStats, type CountryStat } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// Uses browser-only game state and sits behind login with no SEO value, so
// there's nothing gained from prerendering it.
const HigherLowerMode = dynamic(
  () => import("@/components/games/HigherLowerMode").then((m) => m.HigherLowerMode),
  { ssr: false }
);

const game = getGame("higher-or-lower")!;

export default function HigherOrLowerPage() {
  const [countries, setCountries] = useState<CountryStat[] | null>(null);

  useEffect(() => {
    fetchCountryStats(game.dataFile).then(setCountries);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={countries !== null}>
        {(mode) => (
          <HigherLowerMode
            key={mode.slug}
            gameSlug={game.slug}
            modeSlug={mode.slug}
            countries={countries!}
            statKey={mode.slug === "area" ? "area" : "population"}
          />
        )}
      </GameShell>
    </main>
  );
}
