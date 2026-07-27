"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import { fetchRegions, fetchRoads, type RegionFeature, type RoadFeature } from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";
import { MapView } from "@/components/MapView";

// Uses browser-only APIs (an SVG map) and sits behind login with no SEO
// value, so there's nothing gained from prerendering it.
const RoadsMode = dynamic(() => import("@/components/games/RoadsMode").then((m) => m.RoadsMode), {
  ssr: false,
});
import { PracticeMode } from "@/components/games/PracticeMode";

const game = getGame("swedish-roads")!;

function isLineFeature(feature: RegionFeature) {
  return feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString";
}

export default function SwedishRoadsPage() {
  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  // Same "Sweden outline for context" trick RoadsMode itself uses.
  const [sweden, setSweden] = useState<RegionFeature | null>(null);

  useEffect(() => {
    fetchRoads(game.dataFile).then(setRoads);
    fetchRegions("/data/countries_europe.json").then((features) =>
      setSweden(features.find((f) => f.properties.name === "Sweden") ?? null)
    );
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      <GameShell game={game} ready={roads !== null}>
        {(mode) =>
          mode.slug === "practice" ? (
            <PracticeMode
              // filterByMode's `default` case returns every road — practice
              // browses the whole pool regardless of tier, same as "All roads".
              items={filterByMode(roads!, mode.slug)}
              renderQuestion={(r: RoadFeature) => (
                <MapView
                  regionsData={sweden ? [sweden, r] : [r]}
                  fill={(f) => (isLineFeature(f) ? "none" : "var(--muted)")}
                  stroke={(f) => (isLineFeature(f) ? "var(--primary)" : "var(--border)")}
                  strokeWidth={(f) => (isLineFeature(f) ? 4 : 1)}
                  markers={[
                    { lat: r.properties.fromLat, lng: r.properties.fromLng, label: r.properties.fromPlace },
                    { lat: r.properties.toLat, lng: r.properties.toLng, label: r.properties.toPlace },
                  ]}
                />
              )}
              renderAnswer={(r: RoadFeature) => r.properties.designation}
            />
          ) : (
            <RoadsMode
              key={mode.slug}
              gameSlug={game.slug}
              modeSlug={mode.slug}
              roads={filterByMode(roads!, mode.slug)}
            />
          )
        }
      </GameShell>
    </main>
  );
}

// A secondary länsväg's designation is county-letter-prefixed (e.g. "AB
// 646") since its bare number is reused across counties — a primary
// länsväg's designation (100-499) is always just the bare number. This is
// the only signal available to split the two: both share
// roadType === "lansvag" in the data (see lib/games/data.ts's RoadFeature —
// the distinction is deliberately just designation shape, not a separate
// roadType).
const SECONDARY_COUNTY_ROAD_RE = /^[A-Z]{1,2} \d+$/;

function filterByMode(roads: RoadFeature[], modeSlug: string): RoadFeature[] {
  switch (modeSlug) {
    case "motorways":
      return roads.filter((r) => r.properties.roadType === "motorway");
    case "national-roads":
      return roads.filter((r) => r.properties.roadType === "riksvag");
    case "county-roads":
      return roads.filter(
        (r) => r.properties.roadType === "lansvag" && !SECONDARY_COUNTY_ROAD_RE.test(r.properties.designation)
      );
    case "county-roads-secondary":
      return roads.filter(
        (r) => r.properties.roadType === "lansvag" && SECONDARY_COUNTY_ROAD_RE.test(r.properties.designation)
      );
    default:
      return roads;
  }
}
