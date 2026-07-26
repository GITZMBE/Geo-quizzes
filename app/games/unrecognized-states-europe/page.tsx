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

// The extra `category` field (one per registered mode slug) beyond
// CountryFeature's base shape — same "widen the type, don't add a new
// envelope" approach fetchCountryRegions itself already uses.
type UnofficialStateFeature = CountryFeature & { properties: { category: string } };

export default function UnrecognizedStatesEuropePage() {
  const [states, setStates] = useState<UnofficialStateFeature[] | null>(null);

  useEffect(() => {
    fetchCountryRegions(game.dataFile).then((features) =>
      setStates(features as UnofficialStateFeature[])
    );
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={states !== null}>
        {(mode) => (
          <FlagsMode
            key={mode.slug}
            gameSlug={game.slug}
            modeSlug={mode.slug}
            countries={states!.filter((s) => s.properties.category === mode.slug)}
          />
        )}
      </GameShell>
    </main>
  );
}
