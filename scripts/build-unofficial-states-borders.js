// Builds public/data/unofficial_states_borders.json for the "map" mode
// added to the 6 Unofficial States & Territories games (github.com/GITZMBE/
// Geo-quizzes issue #7) — one border polygon per entity from
// unofficial_states.json that a real, public boundary source exists for.
// `properties.name` matches unofficial_states.json's `name` exactly, so a
// game page can join the two files by name; entities with no border here
// simply don't get a "map" round, and a category with zero border features
// at all hides its "map" mode button entirely (see the page components) —
// per explicit product direction, both are meant to self-heal if this file
// later gains more entities, not to be hardcoded exclusion lists elsewhere.
//
// Three source types, mixed per-entity because the entities themselves are
// wildly heterogeneous (see CLAUDE.md's Unofficial States section for the
// full category rationale):
//
//  - "ne-subunits": Natural Earth's 1:10m Admin-0 Map Subunits layer, which
//    (unlike the plain Admin-0 Countries layer used by
//    build-world-countries.js) already carries most non-sovereign
//    territories as their own polygons — Greenland, Hong Kong, Macau,
//    Scotland/Wales/N. Ireland, the Channel Islands, Åland, Puerto Rico,
//    Gibraltar, the Caribbean Dutch constituent countries, the Pacific
//    dependencies, Kosovo, N. Cyprus, Taiwan, Somaliland, W. Sahara,
//    Bougainville, New Caledonia, and even "Iraqi Kurdistan" — confirmed by
//    grepping every NAME/SUBUNIT/ADMIN value in the file before matching.
//    Public domain. Source file (not checked in — download fresh if
//    rerunning, same convention as build-world-countries.js):
//    https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_subunits.geojson
//  - "ne-admin1": Natural Earth's 1:10m Admin-1 States/Provinces layer, used
//    only for Catalonia — Natural Earth has no single "Catalonia" feature,
//    only its 4 constituent provinces (Barcelona, Girona, Lleida, Tarragona,
//    grouped under `region: "Cataluña"`), merged here the same way a
//    same-year multi-feature polity is merged elsewhere in this codebase.
//    Public domain. Source file (not checked in):
//    https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//  - "historical-basemaps": the same aourednik/historical-basemaps source
//    (GPL-3.0, see scripts/build-empires-history.js's header for the full
//    licensing note) used for the Empires Through History info page — one
//    single representative year per Historical States entity, not a
//    multi-era slider like that page, so a nearby "eras" file isn't
//    generated here; just one Feature per entity.
//  - "nominatim": OpenStreetMap's Nominatim search API (polygon_geojson=1)
//    for the 3 post-Soviet breakaway states Natural Earth doesn't carry as
//    map subunits at all (Transnistria, South Ossetia, Abkhazia) — verified
//    by bounding box against each region's known real-world location before
//    trusting the match (OSM data, ODbL). Fetched live, one request per
//    entity with a >=1s delay between (Nominatim's usage policy caps at 1
//    req/sec) and a descriptive User-Agent per that same policy.
//
// Deliberately excluded, with no border feature at all (Flags mode still
// covers them — only "map" mode is affected):
//  - All 5 Micronations (Sealand, Molossia, Liberland, Ladonia, Kugelmugel):
//    none has a real administrative boundary at any usable scale — Sealand
//    is an offshore platform, Molossia a family's yard, Kugelmugel a single
//    house. Nothing to source, not even approximately, without fabricating
//    a boundary that doesn't exist.
//  - Donetsk People's Republic / Luhansk People's Republic: no stable
//    boundary found in either Natural Earth or Nominatim (tried the English
//    and Russian names) — unlike Transnistria/South Ossetia/Abkhazia's
//    decades-old frozen conflicts, these are active/contested since 2014
//    (annexed by Russia in 2022) and OSM has no consistently-tagged
//    administrative relation for either as of this script's writing.
//  - Padania: Lega Nord's aspirational northern-Italy region was never
//    formally bounded by any administrative act, so there's no real
//    geometry to source — approximating one from several Italian regions'
//    borders would be this script inventing a boundary the movement itself
//    never officially defined.
//  - United Arab Republic: no matching NAME in any historical-basemaps
//    year file.
//  - South Vietnam: the dataset's 1960 "Vietnam" feature spans the entire
//    country (8.5-23.3°N), i.e. it's unified Vietnam, not the Republic of
//    Vietnam's actual southern-half territory — using it would misrepresent
//    South Vietnam as the whole country, the same kind of inaccurate-
//    history problem build-empires-history.js's Ottoman/Manchu notes
//    already document and avoid.
//  - Republic of Artsakh: the only "Artsakh" in historical-basemaps is a
//    single 1100 AD snapshot — the medieval Armenian principality, not the
//    same entity as the 1991-2024 self-declared republic. Using it would
//    show the wrong polity's territory under the modern entity's name.
//
// Requires @turf/simplify, not a project dependency since this only runs
// offline as a data-prep step: npm install --no-save @turf/simplify
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const simplify = require("@turf/simplify").default;

const NE_SUBUNITS_FILE = path.join(__dirname, "..", "ne_10m_admin_0_map_subunits.geojson");
const NE_ADMIN1_FILE = path.join(__dirname, "..", "ne_10m_admin_1_states_provinces.geojson");
const HBM_RAW_BASE = "https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson";
const OUT_PATH = path.join(__dirname, "..", "public", "data", "unofficial_states_borders.json");
// Finer than build-empires-history.js's 0.03 — several of these (Jersey,
// Guernsey, Sint Maarten, Niue) are small enough that world-scale tolerance
// would visibly distort or degenerate their shape, and this file is viewed
// zoomed-to-fit per entity (see the "map" mode component), not at world
// scale like the Empires viewer.
const SIMPLIFY_TOLERANCE = 0.01;
const NOMINATIM_USER_AGENT = "geo-quizzes-databuild/1.0 (https://github.com/GITZMBE/Geo-quizzes)";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// De Facto States — all 7 have a real source.
// Autonomous Territories — all 22 have a real source.
// Disputed Territories — 1 of 3 (Western Sahara only).
// Separatist Movements — 3 of 4 (all but Padania).
// Historical States — 8 of 11 (see exclusions above).
// Micronations — 0 of 5 (excluded entirely, see header note).
const ENTITIES = [
  { name: "Kosovo", category: "de-facto-states", source: "ne-subunits", matchName: "Kosovo" },
  { name: "Northern Cyprus", category: "de-facto-states", source: "ne-subunits", matchName: "N. Cyprus" },
  { name: "Transnistria", category: "de-facto-states", source: "nominatim", query: "Transnistria" },
  { name: "South Ossetia", category: "de-facto-states", source: "nominatim", query: "South Ossetia" },
  { name: "Abkhazia", category: "de-facto-states", source: "nominatim", query: "Republic of Abkhazia" },
  { name: "Taiwan", category: "de-facto-states", source: "ne-subunits", matchName: "Taiwan" },
  { name: "Somaliland", category: "de-facto-states", source: "ne-subunits", matchName: "Somaliland" },

  { name: "Greenland", category: "autonomous-territories", source: "ne-subunits", matchName: "Greenland" },
  { name: "Faroe Islands", category: "autonomous-territories", source: "ne-subunits", matchName: "Faeroe Is." },
  { name: "Hong Kong", category: "autonomous-territories", source: "ne-subunits", matchName: "Hong Kong" },
  { name: "Macau", category: "autonomous-territories", source: "ne-subunits", matchName: "Macao" },
  { name: "Scotland", category: "autonomous-territories", source: "ne-subunits", matchName: "Scotland" },
  { name: "Wales", category: "autonomous-territories", source: "ne-subunits", matchName: "Wales" },
  { name: "Northern Ireland", category: "autonomous-territories", source: "ne-subunits", matchName: "N. Ireland" },
  { name: "Åland Islands", category: "autonomous-territories", source: "ne-subunits", matchName: "Åland" },
  { name: "Puerto Rico", category: "autonomous-territories", source: "ne-subunits", matchName: "Puerto Rico" },
  { name: "Gibraltar", category: "autonomous-territories", source: "ne-subunits", matchName: "Gibraltar" },
  { name: "Isle of Man", category: "autonomous-territories", source: "ne-subunits", matchName: "Isle of Man" },
  { name: "Jersey", category: "autonomous-territories", source: "ne-subunits", matchName: "Jersey" },
  // The Bailiwick of Guernsey also includes Sark/Alderney/Herm as separate
  // NE features; simplified to the main island alone (>90% of the
  // Bailiwick's land area) rather than merging 4 features for a handful of
  // small extra islets, the same "good enough to recognize, not
  // cartographically exhaustive" bar MapView's own small-region marker
  // logic already applies elsewhere.
  { name: "Guernsey", category: "autonomous-territories", source: "ne-subunits", matchName: "Guernsey" },
  { name: "Aruba", category: "autonomous-territories", source: "ne-subunits", matchName: "Aruba" },
  { name: "Curaçao", category: "autonomous-territories", source: "ne-subunits", matchName: "Curaçao" },
  { name: "Sint Maarten", category: "autonomous-territories", source: "ne-subunits", matchName: "Sint Maarten" },
  { name: "Bermuda", category: "autonomous-territories", source: "ne-subunits", matchName: "Bermuda" },
  { name: "Cook Islands", category: "autonomous-territories", source: "ne-subunits", matchName: "Cook Is." },
  { name: "Niue", category: "autonomous-territories", source: "ne-subunits", matchName: "Niue" },
  { name: "American Samoa", category: "autonomous-territories", source: "ne-subunits", matchName: "American Samoa" },
  { name: "Guam", category: "autonomous-territories", source: "ne-subunits", matchName: "Guam" },
  { name: "Kurdistan Region", category: "autonomous-territories", source: "ne-subunits", matchName: "Iraqi Kurdistan" },

  { name: "Western Sahara", category: "disputed-territories", source: "ne-subunits", matchName: "W. Sahara" },

  { name: "Catalonia", category: "separatist-movements", source: "ne-admin1", matchRegion: "Cataluña" },
  { name: "Bougainville", category: "separatist-movements", source: "ne-subunits", matchName: "Bougainville" },
  // Shown with the FLNKS flag (per unofficial_states.json), but the
  // territory the movement claims is New Caledonia itself — Natural Earth
  // has no separate "Kanaky" feature since that name isn't used
  // internationally/administratively.
  { name: "Kanaky (New Caledonia)", category: "separatist-movements", source: "ne-subunits", matchName: "New Caledonia" },

  // One representative year per entity, not a multi-era slider — chosen to
  // match the polity's most recognizable/typical extent within the
  // dataset's coverage for that name (see header note for the 3 exclusions).
  { name: "Soviet Union", category: "historical-states", source: "historical-basemaps", year: 1960, matchName: "USSR" },
  { name: "Yugoslavia", category: "historical-states", source: "historical-basemaps", year: 1960, matchName: "Yugoslavia" },
  { name: "Czechoslovakia", category: "historical-states", source: "historical-basemaps", year: 1960, matchName: "Czechoslovakia" },
  { name: "East Germany", category: "historical-states", source: "historical-basemaps", year: 1960, matchName: "East Germany" },
  { name: "Austria-Hungary", category: "historical-states", source: "historical-basemaps", year: 1900, matchName: "Austria Hungary" },
  { name: "Ottoman Empire", category: "historical-states", source: "historical-basemaps", year: 1900, matchName: "Ottoman Empire" },
  // 1994: the actual years Zaire (Mobutu's 1971-1997 renaming of Congo-
  // Kinshasa) matches every other year's "Congo" feature — this is the one
  // year in the dataset's coverage where the country was really named Zaire.
  { name: "Zaire", category: "historical-states", source: "historical-basemaps", year: 1994, matchName: "Zaire" },
  // 1815 (post-Congress of Vienna): the Kingdom of Prussia's most-recognized
  // extent, not its final year (it persisted, administratively, until 1947).
  { name: "Prussia", category: "historical-states", source: "historical-basemaps", year: 1815, matchName: "Prussia" },
];

function mergeByName(features, propKey, propValue) {
  const matches = features.filter((f) => f.properties?.[propKey] === propValue);
  if (matches.length === 0) return null;
  const polygons = [];
  for (const f of matches) {
    if (f.geometry.type === "Polygon") polygons.push(f.geometry.coordinates);
    else if (f.geometry.type === "MultiPolygon") polygons.push(...f.geometry.coordinates);
  }
  if (polygons.length === 0) return null;
  return { type: "MultiPolygon", coordinates: polygons };
}

function fetchHistoricalYear(year, cache) {
  if (cache.has(year)) return cache.get(year);
  const filename = year < 0 ? `world_bc${-year}` : `world_${year}`;
  const text = execFileSync("curl", ["-s", `${HBM_RAW_BASE}/${filename}.geojson`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
  });
  const geojson = JSON.parse(text);
  cache.set(year, geojson);
  return geojson;
}

function fetchNominatim(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ q: query, format: "json", polygon_geojson: "1", limit: "1" }).toString();
  const text = execFileSync("curl", ["-s", "-A", NOMINATIM_USER_AGENT, url], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  const results = JSON.parse(text);
  if (!results.length || !results[0].geojson) return null;
  return results[0].geojson;
}

function simplifyGeometry(geometry) {
  const simplified = simplify(
    { type: "Feature", properties: {}, geometry },
    { tolerance: SIMPLIFY_TOLERANCE, highQuality: false }
  );
  return simplified.geometry;
}

async function main() {
  const neSubunits = JSON.parse(fs.readFileSync(NE_SUBUNITS_FILE, "utf8"));
  const neAdmin1 = JSON.parse(fs.readFileSync(NE_ADMIN1_FILE, "utf8"));
  const hbmCache = new Map();

  const features = [];
  for (const entity of ENTITIES) {
    let geometry = null;

    if (entity.source === "ne-subunits") {
      geometry = mergeByName(neSubunits.features, "NAME", entity.matchName);
    } else if (entity.source === "ne-admin1") {
      geometry = mergeByName(neAdmin1.features, "region", entity.matchRegion);
    } else if (entity.source === "historical-basemaps") {
      const geojson = fetchHistoricalYear(entity.year, hbmCache);
      geometry = mergeByName(geojson.features, "NAME", entity.matchName);
    } else if (entity.source === "nominatim") {
      geometry = fetchNominatim(entity.query);
      // Nominatim's usage policy caps requests at 1/sec — only 3 entities
      // use this source, so a fixed delay after each is simplest.
      await sleep(1200);
    }

    if (!geometry) {
      throw new Error(
        `${entity.name}: expected geometry from "${entity.source}" but found none — source data may have changed, re-verify the match key before re-running.`
      );
    }

    features.push({
      type: "Feature",
      properties: { name: entity.name, category: entity.category },
      geometry: simplifyGeometry(geometry),
    });
  }

  const out = {
    type: "FeatureCollection",
    source:
      "Border polygons from three sources, mixed per-entity: Natural Earth 1:10m Admin-0 Map Subunits and Admin-1 States/Provinces (public domain), aourednik/historical-basemaps (GPL-3.0, same source/license as the Empires Through History info page), and OpenStreetMap via Nominatim (ODbL) for Transnistria/South Ossetia/Abkhazia. See scripts/build-unofficial-states-borders.js for exactly which source backs each entity.",
    note:
      "Covers 41 of the 47 non-micronation entities in unofficial_states.json (all 7 De Facto States, all 22 Autonomous Territories, 1 of 3 Disputed Territories, 3 of 4 Separatist Movements, 8 of 11 Historical States); all 5 Micronations are excluded entirely (no real administrative boundary exists at any usable scale for an offshore platform, a family's yard, or a single house). Also excluded: Donetsk/Luhansk People's Republics (no stable boundary found in either source, unlike the decades-old frozen conflicts Transnistria/South Ossetia/Abkhazia), Padania (never formally bounded by any administrative act), United Arab Republic (no matching name in the historical-basemaps dataset), South Vietnam (the dataset's 1960 \"Vietnam\" feature is unified Vietnam, not just the south — using it would misrepresent South Vietnam's actual territory), and Republic of Artsakh (the dataset's only \"Artsakh\" is a 1100 AD medieval principality, a different entity from the 1991-2024 self-declared republic). See scripts/build-unofficial-states-borders.js's header for the full per-exclusion reasoning.",
    features,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`Wrote ${features.length} border features (of ${ENTITIES.length} attempted) to ${OUT_PATH}`);
  const byCategory = new Map();
  for (const f of features) {
    byCategory.set(f.properties.category, (byCategory.get(f.properties.category) ?? 0) + 1);
  }
  for (const [category, count] of byCategory) console.log(`  ${category}: ${count}`);
}

main();
