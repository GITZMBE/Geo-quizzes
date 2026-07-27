// Data loaders for the read-only "/info" section (not a game — no scoring,
// no leaderboard). Kept separate from lib/games/data.ts on purpose: this
// content doesn't share a shape with any existing game data envelope.
export { fetchWorldBackdrop } from "@/lib/games/data";

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
