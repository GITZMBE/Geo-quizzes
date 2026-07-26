"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchCountryCoatOfArms, type CountryCoatOfArms } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

// Client-only for the same reason as every other mode component: no SSR
// value behind login.
const CoatOfArmsMode = dynamic(
  () => import("@/components/games/CoatOfArmsMode").then((m) => m.CoatOfArmsMode),
  { ssr: false }
);

const game = getGame("national-coat-of-arms")!;

export default function NationalCoatOfArmsPage() {
  const [countries, setCountries] = useState<CountryCoatOfArms[] | null>(null);

  useEffect(() => {
    fetchCountryCoatOfArms(game.dataFile).then(setCountries);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={countries !== null}>
        {() => <CoatOfArmsMode gameSlug={game.slug} countries={countries!} />}
      </GameShell>
    </main>
  );
}
