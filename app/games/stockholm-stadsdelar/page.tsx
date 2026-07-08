"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchDistricts, type DistrictFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// This game uses browser-only APIs (an SVG map) and is behind login with no
// SEO value, so there's nothing gained from prerendering it.
const StockholmMode = dynamic(() => import("./StockholmMode").then((m) => m.StockholmMode), {
  ssr: false,
});

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
        {() => <StockholmMode districts={districts!} />}
      </GameShell>
    </main>
  );
}
