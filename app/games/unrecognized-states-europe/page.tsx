"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCountryRegions, type CountryFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// Reuses the existing FlagsMode component as-is (flag shown -> type the
// name) — this game's data file is shaped as CountryFeature[] specifically
// so no new mode component is needed. Client-only/dynamic for the same
// reason as every other mode component: no SSR value behind login.
const FlagsMode = dynamic(
  () => import("@/components/games/FlagsMode").then((m) => m.FlagsMode),
  { ssr: false }
);

const game = getGame("unrecognized-states-europe")!;

export default function UnrecognizedStatesEuropePage() {
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);

  useEffect(() => {
    fetchCountryRegions(game.dataFile).then(setCountries);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={countries !== null}>
        {() => <FlagsMode gameSlug={game.slug} countries={countries!} />}
      </GameShell>
    </main>
  );
}
