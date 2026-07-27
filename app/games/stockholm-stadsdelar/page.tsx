"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchDistricts, type DistrictFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";
import { MapView } from "@/components/MapView";

// This game uses browser-only APIs (an SVG map) and is behind login with no
// SEO value, so there's nothing gained from prerendering it.
const StockholmMode = dynamic(() => import("./StockholmMode").then((m) => m.StockholmMode), {
  ssr: false,
});
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("stockholm-stadsdelar")!;

export default function StockholmStadsdelarPage() {
  const [districts, setDistricts] = useState<DistrictFeature[] | null>(null);

  useEffect(() => {
    fetchDistricts(game.dataFile).then(setDistricts);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>

      <GameShell game={game} ready={districts !== null}>
        {(mode) =>
          mode.slug === "practice" ? (
            <PracticeMode
              items={districts!}
              renderQuestion={(d: DistrictFeature) => (
                <MapView
                  regionsData={districts!}
                  stroke={() => "var(--foreground)"}
                  fill={(f) =>
                    f.properties.name === d.properties.name ? "rgba(37, 99, 235, 0.65)" : "rgba(37, 99, 235, 0.08)"
                  }
                />
              )}
              renderAnswer={(d: DistrictFeature) => d.properties.name}
            />
          ) : (
            <StockholmMode districts={districts!} />
          )
        }
      </GameShell>
    </main>
  );
}
