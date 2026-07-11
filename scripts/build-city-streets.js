// Builds public/data/city_streets.json for the "Guess the City" game — for
// each of a curated list of major world cities, fetches that city's major
// road network (motorway/trunk/primary, from OpenStreetMap via Overpass)
// clipped to a box around its center, with no place names, borders, or any
// other geographic context — the road pattern itself is the only clue, so
// the player has to recognize the city from its street layout alone.
//
// CITY SELECTION — deliberately curated, not a raw population-rank cut:
// every city below is unambiguously major (a national capital, a country's
// largest metro, or globally iconic), but is *also* chosen for having a
// visually distinctive road layout (a ring road, a radial star, a strict
// grid, a unique planned shape) — a plain top-N-by-population list would
// include many huge but visually generic sprawl cities indistinguishable
// from one another by streets alone, which would make this game's core
// mechanic (recognize the city from its road pattern) unwinnable for most
// entries. Coordinates are reused as-is from the already-sourced
// public/data/world_largest_cities.json (itself built from GeoNames'
// cities15000 dump — see build-world-cities.js), not re-geocoded here.
//
// Overpass endpoint/rate-limit/curl notes below match
// scripts/build-swedish-roads-primary.js exactly (same API, same
// discovered quirks) — see that file for the fuller explanation:
//   - z.overpass-api.de is the specific load-balanced backend confirmed to
//     return real data (others were unhealthy/empty during development).
//   - Requests go through `curl`, not node's fetch (undici) — undici got a
//     hard 406 from this exact server for a byte-identical query that curl
//     succeeded on, back to back, repeatedly confirmed during development.
//   - ~2 concurrent slots per IP observed; this script runs strictly
//     sequentially with a delay between cities.
//
// Requires (installed --no-save, data-prep only, same convention as
// build-us-states.js/build-world-countries.js):
//   npm install --no-save @turf/simplify @turf/helpers
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const simplify = require("@turf/simplify").default;
const { multiLineString } = require("@turf/helpers");

const OVERPASS_URL = "https://z.overpass-api.de/api/interpreter";
const SCRATCH_DIR = path.join(__dirname, "..", ".scratch-city-streets");
const OUT_PATH = path.join(__dirname, "..", "public", "data", "city_streets.json");

// Default half-width of the box fetched around each city center, in km.
// Bumped for a few "ring/radial" cities below so more of their
// characteristic structure falls inside the box.
const DEFAULT_RADIUS_KM = 5;

// motorway/trunk/primary alone is a fair "skeleton" for cities whose
// distinctive feature is genuinely made of major arterials (ring roads,
// radial boulevards) — but for a city whose distinctive feature is its
// *fine-grained* layout (a strict street grid, numbered sectors, a
// hexagonal diplomatic core), OSM tags that layout's actual streets as
// secondary/tertiary, not primary — confirmed by rendering both: Manhattan's
// grid is invisible with motorway/trunk/primary alone (just a few highway
// fragments) and fully recognizable once secondary+tertiary are included.
// Used per-city below via the 4th array element rather than for every city,
// since broadening it for the already-good ring/radial cities would only
// add clutter and file size for no recognizability gain (confirmed on Paris:
// motorway/trunk/primary/secondary nearly doubles the point count there for
// a pattern that already read clearly with three classes).
const GRID_CLASSES = "motorway|trunk|primary|secondary|tertiary";

// [name in world_largest_cities.json, country, distinctive-pattern note, { radiusKm?, classes? }]
const CITIES = [
  ["Paris", "France", "radial boulevards converging on the Périphérique ring"],
  ["New York City", "United States", "Manhattan's strict grid + Broadway's diagonal cut", { classes: GRID_CLASSES }],
  ["Barcelona", "Spain", "Eixample's octagonal grid blocks", { classes: GRID_CLASSES }],
  ["Washington", "United States", "L'Enfant's diagonal avenues over a grid"],
  ["Milan", "Italy", "concentric ring roads"],
  ["Moscow", "Russia", "concentric ring roads + radial spokes", { radiusKm: 9 }],
  ["Beijing", "China", "concentric ring roads", { radiusKm: 9 }],
  ["Canberra", "Australia", "planned geometric circles and parkways"],
  ["Brasilia", "Brazil", "the monumental-axis 'airplane' shape", { classes: GRID_CLASSES }],
  ["Chandigarh", "India", "strict numbered grid sectors", { classes: GRID_CLASSES }],
  ["Islamabad", "Pakistan", "strict grid sectors", { classes: GRID_CLASSES }],
  ["Karlsruhe", "Germany", "the Fächerstadt fan/radial layout"],
  ["Saint Petersburg", "Russia", "radial avenues from the Admiralty", { classes: GRID_CLASSES }],
  ["Buenos Aires", "Argentina", "grid cut by wide diagonal avenues", { classes: GRID_CLASSES }],
  ["Mexico City", "Mexico", "Reforma's diagonal through the grid"],
  ["Tokyo", "Japan", "dense, organic, non-grid street pattern"],
  ["London", "United Kingdom", "irregular medieval-origin street pattern"],
  ["Chicago", "United States", "grid abruptly cut off by the Lake Michigan shoreline", { classes: GRID_CLASSES }],
  ["New Delhi", "India", "Lutyens' hexagonal diplomatic core", { classes: GRID_CLASSES }],
  ["Berlin", "Germany", "radial avenues through the Tiergarten"],
  ["Vienna", "Austria", "the circular Ringstrasse boulevard"],
  ["Detroit", "United States", "radial boulevards converging on Campus Martius"],
  ["Rome", "Italy", "irregular streets radiating from the ancient center"],
  ["Cairo", "Egypt", "dense grid along the Nile"],
  ["Seoul", "South Korea", "river-split grid"],
  ["Singapore", "Singapore", "organized grid on a compact island"],
  ["Hong Kong", "China", "dense, irregular, harborside layout"],
  ["San Francisco", "United States", "a strict grid ignoring the hills beneath it", { classes: GRID_CLASSES }],
  ["Brussels", "Belgium", "the pentagon-shaped inner ring road", { classes: GRID_CLASSES }],
  ["Sydney", "Australia", "irregular harborside street pattern"],
];

fs.mkdirSync(SCRATCH_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function overpass(query, { retries = 6 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const queryFile = path.join(SCRATCH_DIR, "_query.tmp");
      fs.writeFileSync(queryFile, query);
      const text = execFileSync(
        "curl",
        ["-s", "-m", "170", "-X", "POST", OVERPASS_URL, "--data-binary", "@" + queryFile],
        { maxBuffer: 1024 * 1024 * 200, encoding: "utf8" }
      );
      const data = JSON.parse(text);
      if (!data.elements) throw new Error("no elements field: " + text.slice(0, 200));
      return data.elements;
    } catch (err) {
      lastErr = err;
      console.warn(`  Overpass attempt ${attempt + 1} failed: ${err.message?.slice(0, 200)}`);
      await sleep(8000 * (attempt + 1));
    }
  }
  throw lastErr;
}

// Box in degrees around a center point for a given half-width in km —
// longitude delta widened by 1/cos(lat) since a degree of longitude
// shrinks toward the poles.
function boxAround(lat, lng, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - latDelta,
    minLng: lng - lngDelta,
    maxLat: lat + latDelta,
    maxLng: lng + lngDelta,
  };
}

function findCityCoords(worldCities, name, country) {
  const matches = worldCities.items.filter((c) => c.name === name);
  if (matches.length === 0) return null;
  return matches.find((c) => c.country === country) ?? matches[0];
}

async function fetchCityStreets(lat, lng, radiusKm, classes) {
  const box = boxAround(lat, lng, radiusKm);
  const query = `[out:json][timeout:170];way["highway"~"^(${classes})$"](${box.minLat},${box.minLng},${box.maxLat},${box.maxLng});out geom;`;
  const elements = await overpass(query);
  return elements.map((el) => el.geometry.map((p) => [p.lon, p.lat]));
}

// Simplifies point density (Douglas-Peucker, ~33m tolerance) and rounds to
// 5 decimal places (~1m precision — far finer than this game's rendering
// needs) to keep file size reasonable across 30 cities' worth of streets;
// verified visually during development that this tolerance preserves the
// recognizable shape (ring roads, radial spokes) rather than degrading it
// into a blob.
function simplifyLines(lines) {
  if (lines.length === 0) return [];
  const mls = multiLineString(lines);
  const simplified = simplify(mls, { tolerance: 0.0003, highQuality: true });
  return simplified.geometry.coordinates.map((line) =>
    line.map(([lng, lat]) => [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5])
  );
}

async function main() {
  const worldCities = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "public", "data", "world_largest_cities.json"), "utf8")
  );

  const features = [];
  const skipped = [];

  for (const [name, country, note, opts] of CITIES) {
    const coords = findCityCoords(worldCities, name, country);
    if (!coords) {
      console.warn(`SKIP: no coordinates found for ${name}, ${country}`);
      skipped.push(`${name}, ${country}`);
      continue;
    }

    const radiusKm = opts?.radiusKm ?? DEFAULT_RADIUS_KM;
    const classes = opts?.classes ?? "motorway|trunk|primary";
    console.log(`Fetching ${name}, ${country} (radius ${radiusKm}km, classes: ${classes})...`);
    let lines;
    try {
      lines = await fetchCityStreets(coords.lat, coords.lng, radiusKm, classes);
    } catch (err) {
      console.warn(`SKIP: Overpass fetch failed for ${name}: ${err.message?.slice(0, 200)}`);
      skipped.push(`${name}, ${country}`);
      continue;
    }
    if (lines.length === 0) {
      console.warn(`SKIP: no roads returned for ${name}`);
      skipped.push(`${name}, ${country}`);
      continue;
    }

    const simplifiedLines = simplifyLines(lines);
    features.push({
      type: "Feature",
      properties: { name, country, pattern: note },
      geometry: { type: "MultiLineString", coordinates: simplifiedLines },
    });
    console.log(`  ${lines.length} ways -> ${simplifiedLines.length} simplified lines`);

    await sleep(4000);
  }

  const out = {
    type: "FeatureCollection",
    note:
      "Major roads (motorway/trunk/primary) from OpenStreetMap via Overpass, clipped to a box around each city's center and simplified (Douglas-Peucker, ~33m tolerance) for file size. City list is curated for visual distinctiveness (ring roads, radial patterns, strict grids, unique planned shapes), not a raw population cut — see this script's header comment for the reasoning. `properties.pattern` documents each city's distinctive feature for maintainers; not shown to players." +
      (skipped.length > 0 ? ` Skipped (no data returned): ${skipped.join("; ")}.` : " Skipped: none."),
    features,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`\nWrote ${features.length}/${CITIES.length} cities to ${OUT_PATH}`);
  if (skipped.length > 0) console.log("Skipped:", skipped.join(", "));
}

main();
