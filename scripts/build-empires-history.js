// Builds public/data/empires_history.json for the "Empires Through History"
// info page (github.com/GITZMBE/Geo-quizzes issue #4) — for each of a small
// curated set of empires, one border polygon per era they're recognizably
// tracked at.
//
// Source: aourednik/historical-basemaps (github.com/aourednik/historical-
// basemaps), a collection of ~54 world political-border snapshots by year
// (from 123000 BC to 2010 AD), each a GeoJSON FeatureCollection with a NAME
// property per polity. Licensed GPL-3.0 — a copyleft license on the data
// itself, unlike every other geo source this project uses elsewhere (Natural
// Earth, GeoNames, geoBoundaries, OSM are all public-domain/permissive) —
// this was flagged to and accepted by the project owner as a deliberate
// choice for this feature specifically (see issue #4 discussion), not
// something to silently extend to other games.
//
// Empire selection and year coverage were verified empirically (indexing
// every NAME property across all ~54 files, then inspecting each candidate
// empire's per-year bounding box/area to catch placeholder-geometry issues
// like the Ottoman one below) before picking these ten — the deciding
// factor was which empires this dataset tracks under one *stable, single*
// NAME across many years, since anything else would require this script to
// unilaterally decide which of several differently-named constituent
// territories "count" as one continuous empire (e.g. the dataset has no
// single "British Empire" polity — only separately-named holdings like
// "British Raj", "British Somaliland", "British Guiana" per year —
// stitching those into one entity would be this script inventing a
// classification the source data doesn't make, so "British Empire" was
// deliberately left out rather than guessed at).
//
// Similarly excluded: chains of *different* empires that happen to occupy
// the same region (e.g. "Achaemenid Empire" at 500 BC and "Persia" from 1783
// onward are not the same state — Achaemenid/Sassanid/Safavid/Qajar Persia
// are distinct empires separated by centuries and conquests — so no
// "Persia" entry here; a real Persian-empire feature would need its own
// per-era name mapping, not attempted in this first pass).
// Requires @turf/simplify, not a project dependency since this only runs
// offline as a data-prep step: npm install --no-save @turf/simplify
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const simplify = require("@turf/simplify").default;

const RAW_BASE = "https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson";
const OUT_PATH = path.join(__dirname, "..", "public", "data", "empires_history.json");
// Tolerance chosen empirically (same approach as build-us-states.js): high
// enough to meaningfully shrink file size across 32 era-snapshots, low
// enough that a whole-world-scale map (this is displayed at world zoom, not
// clicked at region precision like a states/districts game) doesn't visibly
// lose its shape.
const SIMPLIFY_TOLERANCE = 0.03;

// Each empire: `matchName` is the default NAME to look for in a given year's
// file; an era can override it with its own `matchName` when the dataset
// renames the same polity (documented per-empire below). `label` is shown to
// players; kept distinct from the raw year so eras that need a short gloss
// (e.g. Mongol's only two trackable snapshots) can carry one.
const EMPIRES = [
  {
    id: "ottoman-empire",
    name: "Ottoman Empire",
    matchName: "Ottoman Empire",
    // Stops at 1914, not the dataset's later years: its 1920 and 1930
    // snapshots (renamed "Ottoman Sultanate") turned out, on inspection, to
    // both be the identical small central-Anatolia polygon — not an
    // accurate picture of the empire's actual (rapidly collapsing, Allied-
    // occupied, and by 1922 formally abolished) territory in either year,
    // so those two were dropped rather than shown as real history.
    eras: [
      { year: 1400, label: "1400" },
      { year: 1492, label: "1492" },
      { year: 1500, label: "1500" },
      { year: 1530, label: "1530" },
      { year: 1600, label: "1600" },
      { year: 1650, label: "1650" },
      { year: 1700, label: "1700" },
      { year: 1715, label: "1715" },
      { year: 1783, label: "1783" },
      { year: 1800, label: "1800" },
      { year: 1815, label: "1815" },
      { year: 1880, label: "1880" },
      { year: 1900, label: "1900" },
      { year: 1914, label: "1914 (World War I, its final years as an empire)" },
    ],
  },
  {
    id: "byzantine-empire",
    name: "Byzantine Empire",
    matchName: "Byzantine Empire",
    eras: [
      { year: 800, label: "800" },
      { year: 900, label: "900" },
      { year: 1000, label: "1000" },
      { year: 1100, label: "1100" },
      { year: 1200, label: "1200" },
      { year: 1279, label: "1279" },
      { year: 1300, label: "1300" },
      { year: 1400, label: "1400 (final decades before 1453)" },
    ],
  },
  {
    id: "russian-empire",
    name: "Russian Empire",
    matchName: "Russian Empire",
    eras: [
      { year: 1783, label: "1783" },
      { year: 1800, label: "1800" },
      { year: 1815, label: "1815" },
      { year: 1880, label: "1880" },
      { year: 1900, label: "1900" },
      { year: 1914, label: "1914 (World War I)" },
    ],
  },
  {
    id: "mongol-empire",
    name: "Mongol Empire",
    matchName: "Mongol Empire",
    // Only two years in this dataset track the Mongol Empire as a single
    // named polity at all (it's tiny "Mongolia" again by 1914, long after
    // the empire itself split into the Yuan dynasty and several khanates) —
    // documented in the output `note`, not silently presented as complete
    // coverage the way Ottoman/Byzantine/Russian's longer runs are.
    eras: [
      { year: 1100, label: "1100", matchName: "Mongols" },
      // Not yet the empire's peak — Genghis Khan wasn't declared Khan until
      // 1206, and this snapshot's actual extent (Mongolia/Manchuria border
      // region) reflects the state right around unification, well before
      // the later Eurasia-spanning conquests under his successors.
      { year: 1200, label: "1200 (Genghis Khan's rise to power)" },
    ],
  },
  {
    id: "holy-roman-empire",
    name: "Holy Roman Empire",
    matchName: "Holy Roman Empire",
    // Some years (1279, 1530, 1600) carry two separate features under this
    // same NAME — e.g. the Kingdom of Arles/Burgundy as a disjoint block
    // from the main Central European territory — mergeMatchingFeatures
    // already concatenates every same-year match into one MultiPolygon
    // rather than keeping only the first, so no real territory is dropped.
    eras: [
      { year: 1000, label: "1000" },
      { year: 1100, label: "1100" },
      { year: 1200, label: "1200" },
      { year: 1279, label: "1279" },
      { year: 1300, label: "1300" },
      { year: 1400, label: "1400" },
      { year: 1492, label: "1492" },
      { year: 1500, label: "1500" },
      { year: 1530, label: "1530" },
      { year: 1600, label: "1600" },
      { year: 1650, label: "1650" },
      { year: 1700, label: "1700" },
      { year: 1715, label: "1715 (last snapshot under this name — the Empire persisted, nominally, until its 1806 dissolution)" },
    ],
  },
  {
    id: "khmer-empire",
    name: "Khmer Empire",
    matchName: "Khmer Empire",
    eras: [
      { year: 900, label: "900" },
      { year: 1000, label: "1000" },
      { year: 1100, label: "1100" },
      { year: 1200, label: "1200" },
      { year: 1279, label: "1279" },
      { year: 1300, label: "1300" },
      { year: 1400, label: "1400 (Angkor's decline was already underway; its capital fell to Ayutthayan raids by 1431)" },
    ],
  },
  {
    id: "mughal-empire",
    name: "Mughal Empire",
    matchName: "Mughal Empire",
    eras: [
      { year: 1530, label: "1530" },
      { year: 1600, label: "1600" },
      { year: 1650, label: "1650" },
      { year: 1700, label: "1700" },
      {
        year: 1715,
        label:
          "1715 (near its territorial peak — real power fragmented to regional successor states after 1707, though the empire nominally lasted until 1857)",
      },
    ],
  },
  {
    id: "safavid-empire",
    name: "Safavid Empire",
    matchName: "Safavid Empire",
    eras: [
      { year: 1530, label: "1530" },
      { year: 1600, label: "1600" },
      { year: 1650, label: "1650" },
      { year: 1700, label: "1700" },
      { year: 1715, label: "1715 (its final years before Afghan invaders toppled the dynasty in 1722)" },
    ],
  },
  {
    id: "srivijaya-empire",
    name: "Srivijaya Empire",
    matchName: "Srivijaya Empire",
    eras: [
      { year: 800, label: "800" },
      { year: 900, label: "900" },
      { year: 1000, label: "1000" },
      { year: 1100, label: "1100" },
      { year: 1200, label: "1200" },
      { year: 1279, label: "1279" },
      { year: 1300, label: "1300" },
      { year: 1400, label: "1400 (last snapshot under this name)" },
    ],
  },
  {
    id: "manchu-qing-empire",
    name: "Manchu (Qing) Empire",
    matchName: "Manchu Empire",
    // The dataset renames the same continuous polity to "Qing Empire" for
    // exactly two snapshots (1783, 1800) before reverting to "Manchu
    // Empire" from 1815 on — confirmed by bounding box/area continuity
    // across the switch (1715 "Manchu Empire" ends at ~774 area/141.3°E
    // extent, 1783 "Qing Empire" picks up at ~1293 area/141.3°E, 1815
    // "Manchu Empire" continues at ~1145 area/134.7°E) — so those two eras
    // override matchName rather than being treated as a different empire,
    // same pattern as Mongol's 1100 "Mongols" override above. Stops at
    // 1900, not the dataset's 1914 snapshot: that year's "Manchu Empire"
    // feature is still a real, evolving polygon (not a static placeholder
    // like Ottoman's dropped 1920/1930 years) but the name itself is
    // anachronistic — the Qing dynasty had already fallen in the 1911-12
    // Xinhai Revolution, and the 1914 file has no separate "Republic of
    // China"/similar feature, so presenting it under this name would show
    // wrong history rather than merely thin coverage.
    eras: [
      { year: 1650, label: "1650" },
      { year: 1700, label: "1700" },
      { year: 1715, label: "1715" },
      { year: 1783, label: "1783", matchName: "Qing Empire" },
      { year: 1800, label: "1800", matchName: "Qing Empire" },
      { year: 1815, label: "1815" },
      { year: 1880, label: "1880" },
      { year: 1900, label: "1900 (last snapshot accurately tracked under this name — see the dropped-1914 note above)" },
    ],
  },
];

function fetchYearFile(year, cache) {
  if (cache.has(year)) return cache.get(year);
  const filename = year < 0 ? `world_bc${-year}` : `world_${year}`;
  const text = execFileSync("curl", ["-s", `${RAW_BASE}/${filename}.geojson`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 50,
  });
  const geojson = JSON.parse(text);
  cache.set(year, geojson);
  return geojson;
}

// A polity can appear as more than one Feature in a given year (disjoint
// territory, e.g. exclaves) — concatenate every matching Polygon's rings (or
// MultiPolygon's constituent polygons) into one MultiPolygon rather than
// keeping only the first match, so no real territory silently disappears.
function mergeMatchingFeatures(features, matchName) {
  const matches = features.filter((f) => f.properties?.NAME === matchName);
  if (matches.length === 0) return null;
  const polygons = [];
  for (const f of matches) {
    if (f.geometry.type === "Polygon") polygons.push(f.geometry.coordinates);
    else if (f.geometry.type === "MultiPolygon") polygons.push(...f.geometry.coordinates);
  }
  if (polygons.length === 0) return null;
  const merged = { type: "MultiPolygon", coordinates: polygons };
  const simplified = simplify(
    { type: "Feature", properties: {}, geometry: merged },
    { tolerance: SIMPLIFY_TOLERANCE, highQuality: false }
  );
  return simplified.geometry;
}

function main() {
  const cache = new Map();
  const empiresOut = [];

  for (const empire of EMPIRES) {
    const eras = [];
    const missing = [];
    for (const era of empire.eras) {
      const geojson = fetchYearFile(era.year, cache);
      const matchName = era.matchName ?? empire.matchName;
      const geometry = mergeMatchingFeatures(geojson.features, matchName);
      if (!geometry) {
        missing.push(era.year);
        continue;
      }
      eras.push({ year: era.year, label: era.label, geometry });
    }
    if (missing.length > 0) {
      throw new Error(
        `${empire.name}: expected a "${empire.matchName}" feature in ${missing.join(", ")} but found none — dataset may have changed upstream, re-verify matchName/year before re-running.`
      );
    }
    empiresOut.push({ id: empire.id, name: empire.name, eras });
  }

  const out = {
    source:
      "Border polygons from aourednik/historical-basemaps (github.com/aourednik/historical-basemaps), a collection of world political-border snapshots by year. Licensed GPL-3.0 (a copyleft license on the data itself, a deliberate exception to every other geo source used elsewhere in this codebase, which is public-domain or permissively licensed).",
    note:
      "10 empires tracked under a single stable name in the source dataset across multiple years: Ottoman Empire (14 eras, 1400-1914 — stops there because its 1920/1930 \"Ottoman Sultanate\" snapshots turned out to be an identical, already-reduced-to-central-Anatolia placeholder in the source data, not an accurate picture of the empire's actual final years), Byzantine Empire (8 eras, 800-1400), Russian Empire (6 eras, 1783-1914), Mongol Empire (only 2 eras, 1100 as \"Mongols\" and 1200 as \"Mongol Empire\" — the dataset doesn't track it as a single polity outside this narrow window, so this entry's coverage is deliberately thin rather than padded), Holy Roman Empire (13 eras, 1000-1715), Khmer Empire (7 eras, 900-1400), Mughal Empire (5 eras, 1530-1715), Safavid Empire (5 eras, 1530-1715), Srivijaya Empire (8 eras, 800-1400), and Manchu (Qing) Empire (8 eras, 1650-1900 — two of those, 1783 and 1800, are matched under the dataset's own \"Qing Empire\" rename before it reverts to \"Manchu Empire\"; stops at 1900 rather than the dataset's 1914 snapshot, whose \"Manchu Empire\"-named feature is real geometry but an anachronistic name three years after the Qing dynasty's actual 1911-12 fall, with no separate Republic-of-China feature in that year to use instead). Deliberately excludes empires this dataset only tracks as several separately-named constituent territories per year rather than one polity (e.g. the British Empire — no single \"British Empire\" feature exists in any year file, only holdings like \"British Raj\"/\"British Somaliland\"/\"British Guiana\" — stitching those together would mean this script inventing a classification the source data doesn't make), and chains of historically distinct empires that happen to share a region (e.g. Achaemenid/Sassanid/Safavid/Qajar Persia are different empires across different centuries, not one continuous state — Safavid alone, included above, is its own single-named polity in this dataset, not stitched to the others).",
    empires: empiresOut,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  console.log(`Wrote ${empiresOut.length} empires to ${OUT_PATH}`);
  for (const e of empiresOut) console.log(`  ${e.name}: ${e.eras.length} eras`);
}

main();
