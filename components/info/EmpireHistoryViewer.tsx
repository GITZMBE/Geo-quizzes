"use client";

import { useMemo, useState } from "react";
import { MapView } from "@/components/MapView";
import type { RegionFeature } from "@/lib/games/data";
import type { Empire } from "@/lib/info/data";

type ViewerFeature = RegionFeature & { properties: { name: string; isEmpire: boolean } };

export function EmpireHistoryViewer({
  empires,
  backdrop,
}: {
  empires: Empire[];
  backdrop: RegionFeature[];
}) {
  const [empireId, setEmpireId] = useState(empires[0].id);
  const empire = empires.find((e) => e.id === empireId) ?? empires[0];
  const [eraIndex, setEraIndex] = useState(0);

  // A previous empire's era index shouldn't carry over onto a differently-
  // sized eras array — reset whenever the selected empire changes. Adjusting
  // state during render (React's documented pattern for this) rather than in
  // a useEffect, same reasoning as MapView's own regionsData-change reset.
  const [prevEmpireId, setPrevEmpireId] = useState(empireId);
  if (empireId !== prevEmpireId) {
    setPrevEmpireId(empireId);
    setEraIndex(0);
  }

  const era = empire.eras[eraIndex];

  const backdropFeatures: ViewerFeature[] = useMemo(
    () => backdrop.map((f) => ({ ...f, properties: { name: f.properties.name, isEmpire: false } })),
    [backdrop]
  );

  const regionsData: ViewerFeature[] = useMemo(() => {
    const empireFeature: ViewerFeature = {
      type: "Feature",
      properties: { name: empire.name, isEmpire: true },
      geometry: era.geometry,
    };
    return [...backdropFeatures, empireFeature];
  }, [backdropFeatures, era, empire]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:gap-6">
        <select
          value={empire.id}
          onChange={(e) => setEmpireId(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          {empires.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>

        <div className="flex flex-1 items-center gap-3">
          <input
            type="range"
            min={0}
            max={empire.eras.length - 1}
            value={eraIndex}
            onChange={(e) => setEraIndex(Number(e.target.value))}
            className="flex-1"
            aria-label="Era"
          />
          <span className="w-44 shrink-0 text-right text-sm text-muted-foreground">{era.label}</span>
        </div>
      </div>

      <div className="relative flex-1 rounded-lg border border-border overflow-hidden">
        <MapView
          regionsData={regionsData}
          label={(f) => f.properties.name}
          stroke={(f) => (f.properties.isEmpire ? "var(--foreground)" : "var(--border)")}
          strokeWidth={(f) => (f.properties.isEmpire ? 1.5 : 1)}
          fill={(f) => (f.properties.isEmpire ? "rgba(220, 38, 38, 0.55)" : "rgba(37, 99, 235, 0.08)")}
        />
      </div>
    </div>
  );
}
