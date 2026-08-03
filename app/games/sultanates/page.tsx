"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCountryRegions, type CountryFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// Client-only for the same reason as every other mode component: no SSR
// value behind login.
const FlagsMode = dynamic(
  () => import("@/components/games/FlagsMode").then((m) => m.FlagsMode),
  { ssr: false }
);
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("sultanates")!;

export default function SultanatesPage() {
  const [entities, setEntities] = useState<CountryFeature[] | null>(null);

  useEffect(() => {
    fetchCountryRegions(game.dataFile).then(setEntities);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={entities !== null}>
        {(mode) =>
          mode.slug === "practice" ? (
            <PracticeMode
              items={entities!}
              renderQuestion={(c) => (
                <div className="flex h-full w-full items-center justify-center bg-surface p-6">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external flagcdn.com/Wikidata images, not worth Next/Image config for a fixed-size flag */}
                  <img
                    src={c.properties.flagUrl}
                    alt=""
                    className="h-40 w-64 rounded-md border border-border object-cover shadow-sm"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
              renderAnswer={(c) => (
                <>
                  {c.properties.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    capital: {c.properties.capital}
                  </span>
                </>
              )}
            />
          ) : (
            <FlagsMode gameSlug={game.slug} countries={entities!} />
          )
        }
      </GameShell>
    </main>
  );
}
