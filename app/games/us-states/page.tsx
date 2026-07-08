"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchRegions, type RegionFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// This game uses browser-only APIs (an SVG map) and is behind login with no
// SEO value, so there's nothing gained from prerendering it.
const USStatesMode = dynamic(() => import("./USStatesMode").then((m) => m.USStatesMode), {
  ssr: false,
});

const game = getGame("us-states")!;

export default function USStatesPage() {
  const [states, setStates] = useState<RegionFeature[] | null>(null);

  useEffect(() => {
    fetchRegions(game.dataFile).then(setStates);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>

      <GameShell game={game} ready={states !== null}>
        {() => <USStatesMode states={states!} />}
      </GameShell>
    </main>
  );
}
