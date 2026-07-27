"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchWorldCountries, type WorldCountry } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// Client-only: no map/globe here, but kept consistent with every other
// game's ssr:false pattern since it sits behind login with no SEO value.
const TypeAllMode = dynamic(() => import("./TypeAllMode").then((m) => m.TypeAllMode), {
  ssr: false,
});
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("world-countries")!;

export default function WorldCountriesPage() {
  const [countries, setCountries] = useState<WorldCountry[] | null>(null);

  useEffect(() => {
    fetchWorldCountries(game.dataFile).then(setCountries);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={countries !== null}>
        {(mode) =>
          mode.slug === "practice" ? (
            <PracticeMode
              items={countries!}
              renderQuestion={(c: WorldCountry) => (
                <div className="flex h-full w-full items-center justify-center bg-surface p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external flagcdn.com images, not worth Next/Image config for a fixed-size flag */}
                  <img
                    src={c.flagUrl}
                    alt=""
                    className="h-40 w-64 rounded-md border border-border object-cover shadow-sm"
                  />
                </div>
              )}
              renderAnswer={(c: WorldCountry) => (
                <>
                  {c.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {c.continent} · capital: {c.capital}
                  </span>
                </>
              )}
            />
          ) : (
            <TypeAllMode countries={countries!} />
          )
        }
      </GameShell>
    </main>
  );
}
