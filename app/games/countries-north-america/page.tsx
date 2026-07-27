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
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("countries-north-america")!;

export default function CountriesNorthAmericaPage() {
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
              <CountriesMapMode key="countries" gameSlug={game.slug} countries={countries!} />
            )}
            {mode.slug === "capitals" && (
              <CapitalsMode key="capitals" gameSlug={game.slug} countries={countries!} />
            )}
            {mode.slug === "flags" && (
              <FlagsMode key="flags" gameSlug={game.slug} countries={countries!} />
            )}
            {mode.slug === "practice" && (
              <PracticeMode
                key="practice"
                items={countries!}
                renderQuestion={(c: CountryFeature) => (
                  <div className="flex h-full w-full items-center justify-center bg-surface p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external flagcdn.com images, not worth Next/Image config for a fixed-size flag */}
                    <img
                      src={c.properties.flagUrl}
                      alt=""
                      className="h-40 w-64 rounded-md border border-border object-cover shadow-sm"
                    />
                  </div>
                )}
                renderAnswer={(c: CountryFeature) => (
                  <>
                    {c.properties.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      capital: {c.properties.capital}
                    </span>
                  </>
                )}
              />
            )}
          </>
        )}
      </GameShell>
    </main>
  );
}
