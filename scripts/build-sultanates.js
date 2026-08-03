// Builds public/data/sultanates.json for the "Sultanates" game (github.com/
// GITZMBE/Geo-quizzes issue #52) — a Flags-only game (no Map mode; see the
// note at the bottom of main() for why), same "small, well-documented set,
// document what's excluded" curation approach as Unofficial States &
// Territories (scripts/build-unofficial-states.js, the closest precedent
// for this kind of entity-with-a-flag data).
//
// Two sovereign countries reuse their existing public/data/world_countries.json
// entry as-is (id/name/lat/lng/capital/flagUrl already vetted there — no
// re-resolving against Wikidata), same "own file, join by name" precedent as
// scripts/build-country-stats.js pulling from world_countries.json:
//   - Oman (Sultanate of Oman) — sovereign state, ISO2 "OM".
//   - Brunei (Sultanate of Brunei / Brunei Darussalam) — sovereign state,
//     ISO2 "BN".
//
// Six historical/traditional sultanates, each resolved from Wikidata the
// same way as build-unofficial-states.js (P41 flag -> Commons
// Special:FilePath, P36 capital, P625 coordinate, `iso2` a locally-invented
// short id since none of these six have a real ISO 3166-1 code):
//   - Sultanate of Sulu (Q422065) — historic sultanate based in the Sulu
//     Archipelago/Palawan/NE Borneo, formally ended by the US colonial
//     government in 1915 (a claimant lineage persists today with no
//     territory, similar in spirit to a Micronation, but included here as a
//     historical entry since that's the entity Wikidata's flag/capital/
//     coordinate data actually describes).
//   - Sultanate of Zanzibar (Q157904) — 1856-1964, East African coast +
//     Zanzibar archipelago, ended by the 1964 revolution that led to
//     Tanzania. No P625 (coordinate) on the sultanate item itself — its
//     capital Zanzibar City's own P625 is used as a documented
//     `coordOverride` instead of leaving it out.
//   - Aceh Sultanate (Q1061057) — 1496/1520s-1903/1904, northern Sumatra,
//     ended by Dutch colonial annexation after the decades-long Aceh War.
//   - Johor Sultanate (Q1150344) — founded 1528; unlike the rest of this
//     list it never actually dissolved — it continues today as one of
//     Malaysia's 9 constituent Malay ruler states (a non-sovereign
//     constitutional monarchy within Malaysia, the same "recognized as part
//     of a sovereign state but with its own real institution/flag" shape as
//     Unofficial States' Autonomous Territories category), which is why its
//     Wikidata flag (P41) is literally the modern state of Johor's own
//     flag, not a defunct historical banner.
//   - Adal Sultanate (Q2365048) — 1415-1577, Horn of Africa (based around
//     Zeila/Harar), collapsed after the Ethiopian-Adal War era. Its P41
//     flag file is a modern reconstruction used by present-day political/
//     cultural movements referencing the historical sultanate, same
//     "real, distinct, sourceable flag" bar as everywhere else in this repo
//     — not a contemporaneous 15th-century vexillological artifact (none
//     exists for a state this old), same caveat implicitly true of most
//     pre-modern flags in this file.
//   - Ternate Sultanate (Q2029522) — founded 13th century, North Maluku
//     (Indonesia); like Johor, it still exists today as a non-sovereign
//     traditional/cultural institution (recognized within Indonesia) rather
//     than having formally dissolved, and its Wikidata flag is the
//     institution's own still-used banner.
//
// Explicitly researched and excluded — real Wikidata items exist for every
// one of these (qid noted for anyone re-checking later), but every single
// one has NO P41 (flag) claim at all, so there is nothing genuine to show/
// guess (same bar Unofficial States' Disputed Territories category already
// applies to Kashmir/Golan Heights: no distinct flag = excluded, not
// fabricated):
//   - Mamluk Sultanate of Egypt (Q282428)
//   - Delhi Sultanate (Q229411)
//   - Sultanate of Rum (Q975405)
//   - Malacca Sultanate (Q46652)
//   - Kilwa Sultanate (Q3107156)
//   - Bahmani Sultanate (Q374521)
//   - Sokoto Caliphate (Q600524) — also structurally a caliphate rather than
//     a sultanate (its head carries the title "Sultan of Sokoto" as a
//     traditional/ceremonial role within Nigeria today, but the historical
//     19th-century polity itself was founded and organized as a caliphate);
//     moot either way since it also has no P41 flag and no P36 capital on
//     Wikidata.
//
// Also explicitly excluded: the Ottoman Empire. It's a real, well-documented
// sultanate (arguably history's most famous one) with its own Wikidata flag
// — but it's already a "Historical States" entry in
// public/data/unofficial_states.json (Unofficial States & Territories'
// Flags mode) *and* the subject of its own "Empires Through History" border
// viewer (public/data/empires_history.json, 14 eras 1400-1914). Adding a
// third, near-identical "guess the Ottoman flag" entry here would be pure
// duplication across games rather than adding anything distinct, unlike
// every other entry above.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT_PATH = path.join(__dirname, "..", "public", "data", "sultanates.json");
const WORLD_COUNTRIES_PATH = path.join(__dirname, "..", "public", "data", "world_countries.json");

function commonsFilePathUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Same throttle-plus-backoff policy as scripts/build-unofficial-states.js —
// Wikidata rate-limits rapid back-to-back requests with a 429 (an HTML/text
// error page returned in place of JSON).
function wikidataEntity(qid, attempt = 1) {
  sleepSync(1500);
  const text = execFileSync(
    "curl",
    ["-s", "-A", "GeoQuizzesDataBuild/1.0", `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 }
  );
  try {
    return JSON.parse(text).entities[qid];
  } catch (e) {
    if (attempt >= 6) throw new Error(`${qid}: Wikidata returned non-JSON after ${attempt} attempts (rate-limited?): ${e.message}`);
    sleepSync(3000 * attempt);
    return wikidataEntity(qid, attempt + 1);
  }
}

function wikidataLabel(qid) {
  return wikidataEntity(qid).labels.en.value;
}

// Sourced by direct Wikidata research for this game (see the header comment
// above for which candidates were checked and dropped for lacking a P41
// flag). `iso2` is a locally-invented short id, not a real ISO 3166-1 code
// — same convention as scripts/build-unofficial-states.js.
const ENTITIES = [
  { id: "sulu", iso2: "SUL", name: "Sultanate of Sulu", qid: "Q422065" },
  // No P625 (coordinate) on the sultanate item itself — its capital Zanzibar
  // City's own P625 (Q2222874) is used instead of leaving this entity
  // without a map point.
  { id: "zanzibar", iso2: "ZNZ", name: "Sultanate of Zanzibar", qid: "Q157904", coordOverride: { lat: -6.1666666666667, lng: 39.2 } },
  { id: "aceh", iso2: "ACH", name: "Aceh Sultanate", qid: "Q1061057" },
  { id: "johor", iso2: "JHR", name: "Johor Sultanate", qid: "Q1150344" },
  { id: "adal", iso2: "ADL", name: "Adal Sultanate", qid: "Q2365048" },
  { id: "ternate", iso2: "TRN", name: "Ternate Sultanate", qid: "Q2029522" },
];

function resolveEntity(spec) {
  const entity = wikidataEntity(spec.qid);

  const p41 = entity.claims.P41?.[0]?.mainsnak?.datavalue?.value;
  if (!p41) throw new Error(`${spec.name}: no P41 (flag) value on ${spec.qid} — should have been screened out already.`);
  const flagUrl = commonsFilePathUrl(p41);

  let capital;
  if (spec.capitalOverride) {
    capital = spec.capitalOverride;
  } else {
    const p36 = entity.claims.P36?.[0]?.mainsnak?.datavalue?.value?.id;
    if (!p36) throw new Error(`${spec.name}: no P36 (capital) value on ${spec.qid} and no capitalOverride given.`);
    capital = wikidataLabel(p36);
  }

  let lng, lat;
  if (spec.coordOverride) {
    ({ lng, lat } = spec.coordOverride);
  } else {
    const p625 = entity.claims.P625?.[0]?.mainsnak?.datavalue?.value;
    if (!p625) throw new Error(`${spec.name}: no P625 (coordinate) value on ${spec.qid} and no coordOverride given.`);
    lng = p625.longitude;
    lat = p625.latitude;
  }

  return {
    type: "Feature",
    properties: { name: spec.name, iso2: spec.iso2, capital, flagUrl },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}

function sovereignFeature(countryName) {
  const world = JSON.parse(fs.readFileSync(WORLD_COUNTRIES_PATH, "utf8"));
  const country = world.items.find((c) => c.name === countryName);
  if (!country) throw new Error(`${countryName}: not found in world_countries.json`);
  return {
    type: "Feature",
    properties: { name: country.name, iso2: country.id, capital: country.capital, flagUrl: country.flagUrl },
    geometry: { type: "Point", coordinates: [country.lng, country.lat] },
  };
}

function main() {
  const sovereignFeatures = [sovereignFeature("Oman"), sovereignFeature("Brunei")];
  const historicalFeatures = ENTITIES.map(resolveEntity);
  const features = [...sovereignFeatures, ...historicalFeatures];

  const out = {
    type: "FeatureCollection",
    note:
      "8 sultanates for GitHub issue #52's \"Sultani empires\" ask: 2 current sovereign states (Oman, Brunei — id/name/lat/lng/capital/flagUrl reused as-is from world_countries.json) plus 6 historical/traditional ones each with a real, distinct, Wikidata-sourced flag (Sulu, Zanzibar, Aceh, Johor, Adal, Ternate — Johor and Ternate are both still-existing non-sovereign traditional institutions today, not formally dissolved, similar in status to Unofficial States' Autonomous Territories). " +
      "Explicitly researched and excluded for having NO real distinct flag documented on Wikidata (same 'no fabricated flag' bar as every other entry in this codebase): Mamluk Sultanate of Egypt, Delhi Sultanate, Sultanate of Rum, Malacca Sultanate, Kilwa Sultanate, Bahmani Sultanate, Sokoto Caliphate (also structurally a caliphate, not a sultanate). " +
      "Also excludes the Ottoman Empire on purpose: it already has its own Flags-mode entry in public/data/unofficial_states.json (Historical States) and its own Empires Through History border viewer (public/data/empires_history.json) — a third near-identical entry here would just duplicate existing content, not add anything. " +
      "`iso2` is a real ISO 3166-1 code for Oman/Brunei only; the 6 historical entities use a locally-invented short id (not a real code), same convention as unofficial_states.json. See scripts/build-sultanates.js for full sourcing/exclusion reasoning per entity.",
    features,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${features.length} entities to ${OUT_PATH}`);
}

main();
