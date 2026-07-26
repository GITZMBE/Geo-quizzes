"use client";

import Link from "next/link";
import { useState } from "react";
import { INFO_PAGES } from "@/lib/info/registry";

export default function InfoPage() {
  const [query, setQuery] = useState("");

  const filtered = INFO_PAGES.filter((page) =>
    page.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="flex flex-1 flex-col gap-6 p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-3xl font-bold">Info</h1>

      <input
        type="search"
        placeholder="Search info..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-4 py-2 outline-none focus:ring-2 focus:ring-primary"
      />

      <ul className="flex flex-col gap-3">
        {filtered.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/info/${page.slug}`}
              className="block rounded-lg border border-border bg-surface p-4 hover:border-primary transition-colors"
            >
              <h2 className="text-lg font-semibold">{page.name}</h2>
              <p className="text-sm text-muted-foreground">{page.description}</p>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground">No info pages match your search.</p>
        )}
      </ul>
    </main>
  );
}
