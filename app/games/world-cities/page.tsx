"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchWorldCities, type WorldCity, type RegionFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";
import { MapView } from "@/components/MapView";

// This mode component uses browser-only APIs (globe.gl) and is behind
// login with no SEO value, so there's nothing gained from prerendering it.
const WorldProximityMode = dynamic(
  () => import("./WorldProximityMode").then((m) => m.WorldProximityMode),
  { ssr: false }
);
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("world-cities")!;

export default function WorldCitiesPage() {
  const [cities, setCities] = useState<WorldCity[] | null>(null);

  useEffect(() => {
    fetchWorldCities(game.dataFile).then(setCities);
  }, []);

  // Same "invisible bounding MultiPoint" trick as Sweden's cities practice
  // mode — here it happens to span the whole (flat, Mercator) world, since
  // this game's own 120 cities are spread globally.
  const boundsFeature: RegionFeature | null = cities
    ? {
        type: "Feature",
        properties: { name: "bounds" },
        geometry: { type: "MultiPoint", coordinates: cities.map((c) => [c.lng, c.lat]) },
      }
    : null;

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={cities !== null}>
        {(mode) =>
          mode.slug === "practice" ? (
            <PracticeMode
              items={cities!}
              renderQuestion={(c: WorldCity) => (
                <MapView
                  regionsData={[boundsFeature!]}
                  fill={() => "none"}
                  stroke={() => "none"}
                  markers={[{ lat: c.lat, lng: c.lng, label: "" }]}
                />
              )}
              renderAnswer={(c: WorldCity) => (
                <>
                  {c.name}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {c.country} · #{c.rank} · {c.population.toLocaleString()} people
                  </span>
                </>
              )}
            />
          ) : (
            <WorldProximityMode cities={cities!} />
          )
        }
      </GameShell>
    </main>
  );
}
