"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCities, type City, type RegionFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";
import { MapView } from "@/components/MapView";

// These mode components use browser-only APIs (globe.gl) and are behind
// login with no SEO value, so there's nothing gained from prerendering them.
const TypeAllMode = dynamic(() => import("./TypeAllMode").then((m) => m.TypeAllMode), {
  ssr: false,
});
const ClickDotMode = dynamic(() => import("./ClickDotMode").then((m) => m.ClickDotMode), {
  ssr: false,
});
const ProximityMode = dynamic(() => import("./ProximityMode").then((m) => m.ProximityMode), {
  ssr: false,
});
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("sweden-cities")!;

export default function SwedenCitiesPage() {
  const [cities, setCities] = useState<City[] | null>(null);

  useEffect(() => {
    fetchCities(game.dataFile).then(setCities);
  }, []);

  // Practice mode's map has no country border data to draw (unlike the
  // click-a-region games) — a single invisible MultiPoint feature spanning
  // every city's coordinates gives MapView's fitSize a sensible bounding box
  // (Sweden's own shape, traced out by its 100 biggest cities) without
  // needing a dedicated border file; the actual visible content is just the
  // one `markers` dot for whichever city is the current question.
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
        {(mode) => (
          <>
            {mode.slug === "type-all" && <TypeAllMode key="type-all" cities={cities!} />}
            {mode.slug === "click-dot" && <ClickDotMode key="click-dot" cities={cities!} />}
            {mode.slug === "proximity" && <ProximityMode key="proximity" cities={cities!} />}
            {mode.slug === "practice" && (
              <PracticeMode
                key="practice"
                items={cities!}
                renderQuestion={(c: City) => (
                  <MapView
                    regionsData={[boundsFeature!]}
                    fill={() => "none"}
                    stroke={() => "none"}
                    markers={[{ lat: c.lat, lng: c.lng, label: "" }]}
                  />
                )}
                renderAnswer={(c: City) => (
                  <>
                    {c.name}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      #{c.rank} · {c.population.toLocaleString()} people
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
