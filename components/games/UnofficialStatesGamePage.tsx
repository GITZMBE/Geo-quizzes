"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getGame } from "@/lib/games/registry";
import {
  fetchCountryRegions,
  fetchUnofficialBorders,
  fetchWorldBackdrop,
  type CountryFeature,
  type RegionFeature,
  type UnofficialBorderFeature,
} from "@/lib/games/data";
import { GameShell } from "@/components/games/GameShell";

const FlagsMode = dynamic(
  () => import("@/components/games/FlagsMode").then((m) => m.FlagsMode),
  { ssr: false }
);
const MapGuessMode = dynamic(
  () => import("@/components/games/MapGuessMode").then((m) => m.MapGuessMode),
  { ssr: false }
);
import { PracticeMode } from "@/components/games/PracticeMode";

const FLAGS_DATA_FILE = "/data/unofficial_states.json";
const BORDERS_DATA_FILE = "/data/unofficial_states_borders.json";

// Shared page body for all 6 Unofficial States & Territories games (github.
// com/GITZMBE/Geo-quizzes issue #7 split these out of one combined game) —
// each one filters the same two data files down to its own category, so
// extracting this once avoids repeating identical fetch/filter/mode-gating
// logic across 6 near-identical page.tsx files (each still exists as its
// own route file, same as every other game — Next.js needs a real file per
// route — they just render this with their own gameSlug).
export function UnofficialStatesGamePage({ gameSlug }: { gameSlug: string }) {
  const game = getGame(gameSlug)!;
  // The registry's category slugs were deliberately chosen to equal each
  // game's own slug (de-facto-states, autonomous-territories, etc.) — one
  // less mapping to keep in sync, same reasoning the old combined game used
  // for its per-mode category filter.
  const category = gameSlug;

  const [flagStates, setFlagStates] = useState<(CountryFeature & { properties: { category: string } })[] | null>(
    null
  );
  const [borderStates, setBorderStates] = useState<UnofficialBorderFeature[] | null>(null);
  // World backdrop for Map mode's geographic reference (issue #11) — fetched
  // alongside the other two rather than gated behind picking "map" mode,
  // same as every other data fetch on this page, since GameShell's `ready`
  // already isn't mode-specific.
  const [backdrop, setBackdrop] = useState<RegionFeature[] | null>(null);

  useEffect(() => {
    fetchCountryRegions(FLAGS_DATA_FILE).then((features) =>
      setFlagStates(features as (CountryFeature & { properties: { category: string } })[])
    );
    fetchUnofficialBorders(BORDERS_DATA_FILE).then(setBorderStates);
    fetchWorldBackdrop().then(setBackdrop);
  }, []);

  const countries = flagStates?.filter((s) => s.properties.category === category) ?? null;
  const borders = borderStates?.filter((s) => s.properties.category === category) ?? null;
  const ready = countries !== null && borders !== null && backdrop !== null;

  // "map" mode stays registered in lib/games/registry.ts for every game
  // (including ones with zero border entities today, like Micronations) so
  // a future data addition just works — only the button/availability here
  // is data-driven, per explicit product direction on issue #7.
  const effectiveGame = {
    ...game,
    modes: game.modes.filter((m) => m.slug !== "map" || (borders && borders.length > 0)),
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{game.name}</h1>
      <p className="text-muted-foreground">{game.description}</p>

      {!ready ? (
        // Don't render the mode-picker until every fetch this page depends
        // on has resolved — effectiveGame.modes below is data-driven (the
        // "Map" button only appears once border data has loaded and isn't
        // empty for this category), so rendering GameShell early would show
        // "Flags" first and have "Map" pop in afterward, reported in issue
        // #31. Every other game's mode list is static from the registry, so
        // this loading gate is specific to this shared page, not GameShell
        // itself.
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading...
        </div>
      ) : (
        <GameShell game={effectiveGame} ready={ready}>
          {(mode) => (
            <>
              {mode.slug === "flags" && <FlagsMode key="flags" gameSlug={game.slug} countries={countries!} />}
              {mode.slug === "map" && (
                <MapGuessMode key="map" gameSlug={game.slug} entities={borders!} backdrop={backdrop!} />
              )}
              {mode.slug === "practice" && (
                <PracticeMode
                  key="practice"
                  items={countries!}
                  renderQuestion={(c) => (
                    <div className="flex h-full w-full items-center justify-center bg-surface p-6">
                      {/* eslint-disable-next-line @next/next/no-img-element -- external flagcdn.com/Wikidata images, not worth Next/Image config for a fixed-size flag */}
                      <img
                        src={c.properties.flagUrl}
                        alt=""
                        className="h-40 w-64 rounded-md border border-border object-cover shadow-sm"
                        // flagcdn.com/Wikidata-hosted images are generally
                        // reliable, but a brief outage shouldn't leave a
                        // broken-image icon on screen in Practice mode.
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
              )}
            </>
          )}
        </GameShell>
      )}
    </main>
  );
}
