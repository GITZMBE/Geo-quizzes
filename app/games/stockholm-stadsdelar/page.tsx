"use client";

import dynamic from "next/dynamic";

// Recoil's hook implementation isn't safe to execute during Next.js's server
// prerender pass under React 19 (it reaches into internals that changed
// shape), so this game's content is loaded client-only.
const StockholmGame = dynamic(() => import("./StockholmGame"), {
  ssr: false,
  loading: () => <p className="p-8 text-muted-foreground">Loading...</p>,
});

export default function StockholmStadsdelarPage() {
  return <StockholmGame />;
}
