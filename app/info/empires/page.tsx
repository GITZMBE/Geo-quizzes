"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getInfoPage } from "@/lib/info/registry";
import { fetchEmpiresHistory, fetchWorldBackdrop, type Empire } from "@/lib/info/data";
import type { RegionFeature } from "@/lib/games/data";

// Client-only for the same reason as every game's map-driven mode
// component: an SVG map with no SSR/SEO value behind login.
const EmpireHistoryViewer = dynamic(
  () => import("@/components/info/EmpireHistoryViewer").then((m) => m.EmpireHistoryViewer),
  { ssr: false }
);

const infoPage = getInfoPage("empires")!;
const EMPIRES_DATA_URL = "/data/empires_history.json";

export default function EmpiresHistoryPage() {
  const [empires, setEmpires] = useState<Empire[] | null>(null);
  const [backdrop, setBackdrop] = useState<RegionFeature[] | null>(null);

  useEffect(() => {
    fetchEmpiresHistory(EMPIRES_DATA_URL).then(setEmpires);
    fetchWorldBackdrop().then(setBackdrop);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-4 p-8">
      <h1 className="text-2xl font-bold">{infoPage.name}</h1>
      <p className="text-muted-foreground">{infoPage.description}</p>

      {empires && backdrop ? (
        <EmpireHistoryViewer empires={empires} backdrop={backdrop} />
      ) : (
        <p className="text-muted-foreground">Loading…</p>
      )}
    </main>
  );
}
