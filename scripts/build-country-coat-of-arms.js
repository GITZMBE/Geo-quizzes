// Builds public/data/country_coat_of_arms.json for the "National Coat of
// Arms" game — one coat-of-arms image per country, cross-referenced against
// the existing 197-country list in public/data/world_countries.json (id/
// name/lat/lng reused from there, not re-derived), same pattern as
// scripts/build-country-stats.js.
//
// Source: Wikidata property P94 (coat of arms image), matched by ISO 3166-1
// alpha-2 (P297) via one bulk SPARQL query against query.wikidata.org. This
// returns a commons.wikimedia.org/wiki/Special:FilePath/<file>.svg URL per
// country — Wikimedia's documented stable hotlink pattern (redirects
// straight to the current upload.wikimedia.org file), used the same way
// flagcdn.com URLs are used elsewhere in this codebase: referenced directly,
// never downloaded.
//
// The bulk query's index (Wikidata Query Service) can lag a few days behind
// live edits, so a handful of countries may have a live P94 value the bulk
// query doesn't return yet (seen for Denmark and Turkey as of this script's
// original run). For any of world_countries.json's 197 ISO2 codes missing
// from the bulk result, this script falls back to a live per-entity lookup:
// resolve the country's Wikidata QID by ISO2, then read P94 directly off
// that entity's live JSON.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const OUT_PATH = path.join(__dirname, "..", "public", "data", "country_coat_of_arms.json");

function sparql(query) {
  // curl, not node's fetch — same convention as build-country-stats.js.
  const text = execFileSync(
    "curl",
    ["-s", "-G", SPARQL_ENDPOINT, "--data-urlencode", `query=${query}`, "-H", "Accept: application/sparql-results+json"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 }
  );
  return JSON.parse(text).results.bindings;
}

function commonsFilePathUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

function fetchBulkCoatOfArms() {
  // No P31 (instance-of) class restriction — some countries (e.g. Denmark)
  // aren't tagged as the specific "sovereign state" class this data would
  // otherwise be filtered by, so matching on P297+P94 alone is what actually
  // gets full coverage.
  const rows = sparql("SELECT ?iso2 ?coa WHERE { ?country wdt:P297 ?iso2 . ?country wdt:P94 ?coa . }");
  const map = new Map();
  for (const row of rows) {
    // The P94 SPARQL binding is already a full Special:FilePath URL (unlike
    // the live per-entity JSON path below, which returns a bare filename) —
    // just upgrade to https, don't re-wrap it.
    map.set(row.iso2.value, row.coa.value.replace(/^http:/, "https:"));
  }
  return map;
}

function fetchLiveCoatOfArms(iso2) {
  const qidRows = sparql(`SELECT ?country WHERE { ?country wdt:P297 "${iso2}" }`);
  if (qidRows.length === 0) return null;
  const qid = qidRows[0].country.value.split("/").pop();

  const entityJson = execFileSync("curl", ["-s", `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const entity = JSON.parse(entityJson).entities[qid];
  const claim = entity.claims.P94?.[0]?.mainsnak?.datavalue?.value;
  return claim ? commonsFilePathUrl(claim) : null;
}

function main() {
  const world = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "public", "data", "world_countries.json"), "utf8")
  );
  const bulk = fetchBulkCoatOfArms();

  const items = [];
  const dropped = [];
  const viaFallback = [];
  for (const country of world.items) {
    let coatOfArmsUrl = bulk.get(country.id);
    if (!coatOfArmsUrl) {
      coatOfArmsUrl = fetchLiveCoatOfArms(country.id);
      if (coatOfArmsUrl) viaFallback.push(country.name);
    }
    if (!coatOfArmsUrl) {
      dropped.push(country.name);
      continue;
    }
    items.push({
      id: country.id,
      name: country.name,
      lat: country.lat,
      lng: country.lng,
      coatOfArmsUrl,
    });
  }

  const out = {
    kind: "points",
    source:
      "Coat of arms images from Wikidata (property P94), matched by ISO 3166-1 alpha-2 (P297) against the existing 197-country list in public/data/world_countries.json (id/name/lat/lng reused from there, not re-derived). Image URLs are Wikimedia Commons Special:FilePath links, the stable hotlink form for Commons files.",
    note:
      (dropped.length === 0
        ? `All ${world.items.length} countries from world_countries.json had a P94 coat-of-arms image.`
        : `${items.length}/${world.items.length} countries from world_countries.json had a P94 coat-of-arms image. Dropped (no P94 value found, even via live per-entity lookup): ${dropped.join(", ")}.`) +
      (viaFallback.length > 0
        ? ` ${viaFallback.length} countries (${viaFallback.join(", ")}) needed the live per-entity fallback lookup because Wikidata's bulk query service hadn't yet indexed their P94 value at the time this file was built.`
        : ""),
    items,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${items.length} countries to ${OUT_PATH}`);
  if (viaFallback.length > 0) console.log("Via fallback lookup:", viaFallback.join(", "));
  if (dropped.length > 0) console.log("Dropped:", dropped.join(", "));
}

main();
