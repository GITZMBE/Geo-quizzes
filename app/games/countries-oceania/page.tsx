"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCountryRegions, type CountryFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// These mode components use browser-only APIs (an SVG map, or none at all)
// and are behind login with no SEO value, so there's nothing gained from
// prerendering them.
const CountriesMapMode = dynamic(
  () => import("@/components/games/CountriesMapMode").then((m) => m.CountriesMapMode),
  { ssr: false }
);
const CapitalsMode = dynamic(
  () => import("@/components/games/CapitalsMode").then((m) => m.CapitalsMode),
  { ssr: false }
);
const FlagsMode = dynamic(
  () => import("@/components/games/FlagsMode").then((m) => m.FlagsMode),
  { ssr: false }
);

const game = getGame("countries-oceania")!;

export default function CountriesOceaniaPage() {
  const [countries, setCountries] = useState<CountryFeature[] | null>(null);

  useEffect(() => {
    fetchCountryRegions(game.dataFile).then(setCountries);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={countries !== null}>
        {(mode) => (
          <>
            {mode.slug === "countries" && (
              <CountriesMapMode
                key="countries"
                gameSlug={game.slug}
                countries={countries!}
                projection="pacific"
              />
            )}
            {mode.slug === "capitals" && (
              <CapitalsMode key="capitals" gameSlug={game.slug} countries={countries!} />
            )}
            {mode.slug === "flags" && (
              <FlagsMode key="flags" gameSlug={game.slug} countries={countries!} />
            )}
          </>
        )}
      </GameShell>
    </main>
  );
}
