// Builds public/data/country_stats.json for the "Higher or Lower" game —
// population and area (km²) per country, cross-referenced against the
// existing 197-country list in public/data/world_countries.json (id/name/
// flagUrl already vetted there — see that file's own `note` for exactly
// which territories were excluded and why) rather than re-deriving country
// selection here.
//
// Source: GeoNames' countryInfo.txt (download.geonames.org/export/dump/
// countryInfo.txt), a tab-separated dump keyed by ISO alpha-2, columns:
// ISO, ISO3, ISO-Numeric, fips, Country, Capital, Area(in sq km),
// Population, Continent, tld, CurrencyCode, ... — only Area and Population
// are needed here, matched by ISO alpha-2 (world_countries.json's `id`).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const COUNTRY_INFO_URL = "https://download.geonames.org/export/dump/countryInfo.txt";
const OUT_PATH = path.join(__dirname, "..", "public", "data", "country_stats.json");

function fetchCountryInfo() {
  // curl, not node's fetch — matches the convention already established in
  // scripts/build-swedish-roads-primary.js for a different host, applied
  // here too since there's no reason to assume undici behaves any better
  // against a different bulk-download server than it did against Overpass.
  const text = execFileSync("curl", ["-s", COUNTRY_INFO_URL], { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 });
  const rows = new Map();
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const cols = line.split("\t");
    const iso2 = cols[0];
    const area = Number(cols[6]);
    const population = Number(cols[7]);
    if (!iso2) continue;
    rows.set(iso2, { area, population });
  }
  return rows;
}

function main() {
  const world = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "public", "data", "world_countries.json"), "utf8")
  );
  const countryInfo = fetchCountryInfo();

  const items = [];
  const dropped = [];
  for (const country of world.items) {
    const stats = countryInfo.get(country.id);
    if (!stats || !Number.isFinite(stats.area) || stats.area <= 0 || !Number.isFinite(stats.population) || stats.population <= 0) {
      dropped.push(country.name);
      continue;
    }
    items.push({
      id: country.id,
      name: country.name,
      lat: country.lat,
      lng: country.lng,
      population: stats.population,
      area: stats.area,
      flagUrl: country.flagUrl,
    });
  }

  const out = {
    kind: "points",
    source:
      "Population and area from GeoNames countryInfo.txt, cross-referenced by ISO alpha-2 against the existing 197-country list in public/data/world_countries.json (id/name/lat/lng/flagUrl reused from there, not re-derived).",
    note:
      dropped.length === 0
        ? `All ${world.items.length} countries from world_countries.json had usable population/area data. Dropped: none.`
        : `${items.length}/${world.items.length} countries from world_countries.json had usable population/area data. Dropped (no GeoNames row, or zero/missing area or population): ${dropped.join(", ")}.`,
    items,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${items.length} countries to ${OUT_PATH}`);
  if (dropped.length > 0) console.log("Dropped:", dropped.join(", "));
}

main();
