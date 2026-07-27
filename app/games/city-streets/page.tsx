"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCityStreets, type CityStreetsFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";
import { MapView } from "@/components/MapView";

// Uses browser-only APIs (an SVG map) and sits behind login with no SEO
// value, so there's nothing gained from prerendering it.
const CityStreetsMode = dynamic(
  () => import("@/components/games/CityStreetsMode").then((m) => m.CityStreetsMode),
  { ssr: false }
);
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("city-streets")!;

export default function CityStreetsPage() {
  const [cities, setCities] = useState<CityStreetsFeature[] | null>(null);

  useEffect(() => {
    fetchCityStreets(game.dataFile).then(setCities);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={cities !== null}>
        {(mode) =>
          mode.slug === "practice" ? (
            <PracticeMode
              items={cities!}
              renderQuestion={(c: CityStreetsFeature) => (
                <MapView regionsData={[c]} fill={() => "none"} stroke={() => "var(--foreground)"} />
              )}
              renderAnswer={(c: CityStreetsFeature) => (
                <>
                  {c.properties.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{c.properties.country}</span>
                </>
              )}
            />
          ) : (
            <CityStreetsMode key={mode.slug} gameSlug={game.slug} modeSlug={mode.slug} cities={cities!} />
          )
        }
      </GameShell>
    </main>
  );
}
