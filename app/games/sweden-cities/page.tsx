"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCities, type City } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

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

const game = getGame("sweden-cities")!;

export default function SwedenCitiesPage() {
  const [cities, setCities] = useState<City[] | null>(null);

  useEffect(() => {
    fetchCities(game.dataFile).then(setCities);
  }, []);

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
          </>
        )}
      </GameShell>
    </main>
  );
}
