// Data loaders for the read-only "/info" section (not a game — no scoring,
// no leaderboard). Kept separate from lib/games/data.ts on purpose: this
// content doesn't share a shape with any existing game data envelope.
import { fetchCountryRegions } from "@/lib/games/data";

export type EmpireEra = {
  year: number;
  label: string;
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown };
};

export type Empire = {
  id: string;
  name: string;
  eras: EmpireEra[];
};

export async function fetchEmpiresHistory(url: string): Promise<Empire[]> {
  const res = await fetch(url);
  const data: { empires: Empire[] } = await res.json();
  return data.empires;
}

// Modern-day country outlines, reused as-is (not re-fetched/re-simplified)
// purely for orientation behind an empire's historical border — the six
// per-continent files already cover the whole world between them, so
// there's no reason to add a dedicated world-outline data file just for
// this. Genuinely historical context (what else existed in that specific
// era) isn't attempted here — see empires_history.json's own `note` for why
// only the empire's own border is shown, not a full period-accurate map.
const CONTINENT_FILES = [
  "/data/countries_africa.json",
  "/data/countries_asia.json",
  "/data/countries_europe.json",
  "/data/countries_north-america.json",
  "/data/countries_south-america.json",
  "/data/countries_oceania.json",
];

export async function fetchWorldBackdrop() {
  const perContinent = await Promise.all(CONTINENT_FILES.map((url) => fetchCountryRegions(url)));
  return perContinent.flat();
}
