// Builds public/data/unofficial_states.json for the "Unofficial States &
// Territories" game — an expansion of the original 5-state, Europe-only
// "Unofficial European States" (github.com/GITZMBE/Geo-quizzes issue #2)
// into 6 worldwide categories, each its own game mode (registered in
// lib/games/registry.ts, filtered client-side in
// app/games/unrecognized-states-europe/page.tsx by `properties.category`,
// same one-file-many-modes pattern as scripts/build-swedish-roads-*.js).
//
// Every entity's flag/capital/coordinates are resolved the same rigorous
// way as the original 5 (never a guessed/fabricated URL): flagcdn.com where
// a code already exists (most autonomous territories, since flagcdn already
// covers UK/Danish/Dutch/US subdivisions the same way world_countries.json
// uses it for sovereign states), Wikidata property P41 (flag image) →
// Commons Special:FilePath otherwise, P36 (capital) and P625 (coordinate
// location) for the rest. A few explicit overrides are documented inline
// where the raw Wikidata/dataset value would be misleading (see CAPITAL
// overrides below).
//
// Category scope, decided with the project owner before building this (see
// the plan this shipped from):
// - De facto states: worldwide, not just Europe.
// - Autonomous territories: recognized as part of a sovereign state, own
//   flag, real self-government.
// - Disputed territories: kept deliberately small (3) — includes active,
//   ongoing disputes (Donetsk/Luhansk) per explicit product direction,
//   unlike this file's original Europe-only version. Excludes Kashmir and
//   the Golan Heights: neither has a flag distinct from the states
//   disputing them, so there's nothing to actually show/guess.
// - Separatist movements: deliberately screened to political movements
//   represented by a real, distinct flag used by a legitimate political
//   movement/party — NOT militant or currently-designated-terrorist
//   organizations (excludes e.g. Tamil Eelam/LTTE, Balochistan insurgent
//   groups, West Papua's OPM, Chechnya/Ichkeria). This is narrower than
//   "include active disputes" was taken to mean for disputed *territories*
//   (a state-vs-state land dispute) — this exclusion is specifically about
//   armed/militant movements, a different kind of risk.
// - Historical states: 20th-century-dissolved cutoff only, to keep this
//   bounded (otherwise unbounded — every defunct kingdom in history would
//   qualify).
// - Micronations: lowest sensitivity, self-declared entities with no real
//   recognition.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT_PATH = path.join(__dirname, "..", "public", "data", "unofficial_states.json");
const OLD_EUROPE_PATH = path.join(__dirname, "..", "public", "data", "unrecognized_states_europe.json");

function commonsFilePathUrl(filename) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
}

function wikidataEntity(qid) {
  const text = execFileSync("curl", ["-s", "-A", "GeoQuizzesDataBuild/1.0", `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  return JSON.parse(text).entities[qid];
}

function wikidataLabel(qid) {
  return wikidataEntity(qid).labels.en.value;
}

// category slugs match the mode slugs registered in lib/games/registry.ts
const ENTITIES = [
  // --- De facto states (worldwide) ---
  { id: "taiwan", name: "Taiwan", category: "de-facto-states", qid: "Q865" },
  { id: "somaliland", name: "Somaliland", category: "de-facto-states", qid: "Q34754" },

  // --- Autonomous territories ---
  { id: "greenland", name: "Greenland", category: "autonomous-territories", qid: "Q223", flagcdnCode: "gl" },
  { id: "faroe-islands", name: "Faroe Islands", category: "autonomous-territories", qid: "Q4628", flagcdnCode: "fo" },
  { id: "hong-kong", name: "Hong Kong", category: "autonomous-territories", qid: "Q8646", flagcdnCode: "hk" },
  // Macau is itself a single city — no separate capital distinct from the
  // territory, unlike every other entry here.
  { id: "macau", name: "Macau", category: "autonomous-territories", qid: "Q14773", flagcdnCode: "mo", capitalOverride: "Macau" },
  { id: "scotland", name: "Scotland", category: "autonomous-territories", qid: "Q22", flagcdnCode: "gb-sct" },
  { id: "wales", name: "Wales", category: "autonomous-territories", qid: "Q25", flagcdnCode: "gb-wls" },
  { id: "northern-ireland", name: "Northern Ireland", category: "autonomous-territories", qid: "Q26", flagcdnCode: "gb-nir" },
  { id: "aland-islands", name: "Åland Islands", category: "autonomous-territories", qid: "Q5689", flagcdnCode: "ax" },
  { id: "puerto-rico", name: "Puerto Rico", category: "autonomous-territories", qid: "Q1183", flagcdnCode: "pr" },
  { id: "gibraltar", name: "Gibraltar", category: "autonomous-territories", qid: "Q1410", flagcdnCode: "gi", capitalOverride: "Gibraltar" },
  { id: "isle-of-man", name: "Isle of Man", category: "autonomous-territories", qid: "Q9676", flagcdnCode: "im" },
  { id: "jersey", name: "Jersey", category: "autonomous-territories", qid: "Q785", flagcdnCode: "je" },
  { id: "guernsey", name: "Guernsey", category: "autonomous-territories", qid: "Q25230", flagcdnCode: "gg" },
  { id: "aruba", name: "Aruba", category: "autonomous-territories", qid: "Q21203", flagcdnCode: "aw" },
  { id: "curacao", name: "Curaçao", category: "autonomous-territories", qid: "Q25279", flagcdnCode: "cw" },
  { id: "sint-maarten", name: "Sint Maarten", category: "autonomous-territories", qid: "Q26273", flagcdnCode: "sx" },
  { id: "bermuda", name: "Bermuda", category: "autonomous-territories", qid: "Q23635", flagcdnCode: "bm" },
  { id: "cook-islands", name: "Cook Islands", category: "autonomous-territories", qid: "Q26988", flagcdnCode: "ck" },
  { id: "niue", name: "Niue", category: "autonomous-territories", qid: "Q34020", flagcdnCode: "nu" },
  { id: "american-samoa", name: "American Samoa", category: "autonomous-territories", qid: "Q16641", flagcdnCode: "as" },
  { id: "guam", name: "Guam", category: "autonomous-territories", qid: "Q16635", flagcdnCode: "gu" },
  { id: "kurdistan-region", name: "Kurdistan Region", category: "autonomous-territories", qid: "Q205047" },

  // --- Disputed territories (deliberately small — see header) ---
  { id: "western-sahara", name: "Western Sahara", category: "disputed-territories", qid: "Q40362", capitalOverride: "Laayoune" },
  { id: "donetsk-pr", name: "Donetsk People's Republic", category: "disputed-territories", qid: "Q16150196" },
  { id: "luhansk-pr", name: "Luhansk People's Republic", category: "disputed-territories", qid: "Q16746854" },

  // --- Separatist movements (screened — see header) ---
  // Catalonia's coordinates/capital come from the region itself (Q5705),
  // but the flag shown is the Estelada — the flag flown by the
  // independence movement specifically, distinct from Catalonia's official
  // flag (the Senyera) which already effectively represents the region as
  // a whole, not the movement.
  { id: "catalonia", name: "Catalonia", category: "separatist-movements", qid: "Q5705", flagFile: "Estelada blava.svg" },
  { id: "bougainville", name: "Bougainville", category: "separatist-movements", qid: "Q18826" },
  // New Caledonia's own official flag is French; the flag shown here is
  // the FLNKS (Kanak and Socialist National Liberation Front) flag flown by
  // the pro-independence movement specifically.
  { id: "kanaky", name: "Kanaky (New Caledonia)", category: "separatist-movements", qid: "Q33788", flagFile: "Flag of FLNKS.svg" },
  // Padania is a political concept (Lega Nord's proposed northern-Italy
  // state), not a place with its own Wikidata coordinate/capital entity —
  // Milan is the informal center of the concept in the movement's own
  // rhetoric, used here as a documented representative point rather than a
  // literal claimed capital.
  { id: "padania", name: "Padania", category: "separatist-movements", flagFile: "Flag of Padania.svg", capitalOverride: "Milan (informal, not a claimed capital)", coordOverride: { lng: 9.19, lat: 45.4642 } },

  // --- Historical states (20th-century-dissolved cutoff) ---
  { id: "soviet-union", name: "Soviet Union", category: "historical-states", qid: "Q15180" },
  { id: "yugoslavia", name: "Yugoslavia", category: "historical-states", qid: "Q83286" },
  // Wikidata's P41 for Czechoslovakia points to "Flag of the Czech
  // Republic.svg" — the same visual design (the Czech Republic kept it
  // after the 1993 split), but the dedicated "Flag of Czechoslovakia.svg"
  // file is used here for clarity given the answer is "Czechoslovakia".
  { id: "czechoslovakia", name: "Czechoslovakia", category: "historical-states", qid: "Q33946", flagFile: "Flag of Czechoslovakia.svg" },
  { id: "east-germany", name: "East Germany", category: "historical-states", qid: "Q16957" },
  { id: "austria-hungary", name: "Austria-Hungary", category: "historical-states", qid: "Q28513" },
  // Wikidata's P36 capital for the Ottoman Empire is Söğüt, the founding
  // capital of the dynasty (13th century) — not Constantinople/Istanbul,
  // the imperial capital for nearly all of the empire's history and what
  // players would expect.
  { id: "ottoman-empire", name: "Ottoman Empire", category: "historical-states", qid: "Q12560", capitalOverride: "Constantinople" },
  { id: "united-arab-republic", name: "United Arab Republic", category: "historical-states", qid: "Q170468" },
  { id: "south-vietnam", name: "South Vietnam", category: "historical-states", qid: "Q180573" },
  { id: "zaire", name: "Zaire", category: "historical-states", qid: "Q6500954" },
  { id: "prussia", name: "Prussia", category: "historical-states", qid: "Q27306" },
  // Wikidata's current P36 capital label is "Khankendi" (the Azerbaijani
  // name, reflecting Azerbaijan's post-2024 full control) — "Stepanakert"
  // (the Armenian name) is used here since that's what this specific de
  // facto government (which no longer exists) itself called its capital
  // throughout its 1991-2024 existence.
  { id: "artsakh", name: "Republic of Artsakh", category: "historical-states", qid: "Q244165", capitalOverride: "Stepanakert" },

  // --- Micronations ---
  { id: "sealand", name: "Sealand", category: "micronations", qid: "Q13706", capitalOverride: "HM Fort Roughs" },
  { id: "molossia", name: "Molossia", category: "micronations", qid: "Q1155768", capitalOverride: "Molossia" },
  { id: "liberland", name: "Liberland", category: "micronations", qid: "Q19801186", capitalOverride: "Liberland" },
  { id: "ladonia", name: "Ladonia", category: "micronations", qid: "Q968430", capitalOverride: "Ladonia" },
  { id: "kugelmugel", name: "Kugelmugel", category: "micronations", qid: "Q877579", flagFile: "Flag of Kugelmugel in Austria.png", capitalOverride: "Kugelmugel" },
];

function resolveEntity(spec) {
  const entity = spec.qid ? wikidataEntity(spec.qid) : null;

  let flagUrl;
  if (spec.flagcdnCode) {
    flagUrl = `https://flagcdn.com/w320/${spec.flagcdnCode}.png`;
  } else if (spec.flagFile) {
    flagUrl = commonsFilePathUrl(spec.flagFile);
  } else {
    const p41 = entity.claims.P41?.[0]?.mainsnak?.datavalue?.value;
    if (!p41) throw new Error(`${spec.name}: no P41 (flag) value on ${spec.qid} and no flagcdnCode/flagFile override given.`);
    flagUrl = commonsFilePathUrl(p41);
  }

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
    properties: {
      name: spec.name,
      iso2: spec.id.slice(0, 3).toUpperCase(),
      capital,
      category: spec.category,
      flagUrl,
    },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}

function main() {
  const oldEurope = JSON.parse(fs.readFileSync(OLD_EUROPE_PATH, "utf8"));
  const europeFeatures = oldEurope.features.map((f) => ({
    ...f,
    properties: { ...f.properties, category: "de-facto-states" },
  }));

  const newFeatures = ENTITIES.map(resolveEntity);

  const categoryCounts = {};
  for (const f of [...europeFeatures, ...newFeatures]) {
    categoryCounts[f.properties.category] = (categoryCounts[f.properties.category] ?? 0) + 1;
  }

  const out = {
    type: "FeatureCollection",
    note:
      "6 categories from GitHub issue #2's original ask, worldwide, each its own game mode via `properties.category`: " +
      Object.entries(categoryCounts).map(([c, n]) => `${c} (${n})`).join(", ") +
      ". Disputed territories deliberately excludes Kashmir/Golan Heights (no flag distinct from the states disputing them). " +
      "Separatist movements is screened to real political movements with their own distinct flag, excluding militant/" +
      "terrorist-designated organizations (e.g. Tamil Eelam/LTTE, Balochistan insurgent groups, West Papua's OPM, Chechnya/Ichkeria) " +
      "even though disputed-territories does include active disputes (Donetsk/Luhansk) per explicit product direction. " +
      "Historical states is cut off at 20th-century-dissolved states only, otherwise unbounded. " +
      "`iso2` is a locally-invented short id (none of these entities have a real ISO 3166-1 code), kept only to satisfy " +
      "CountryFeature's shared type shape. Flags from flagcdn.com (autonomous territories, matching world_countries.json's " +
      "convention) or Wikidata property P41 (Commons Special:FilePath, the rest); capitals from P36, coordinates from P625 " +
      "— all with documented per-entity overrides where the raw value would be misleading (see scripts/build-unofficial-states.js).",
    features: [...europeFeatures, ...newFeatures],
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.features.length} entities to ${OUT_PATH}`);
  console.log(categoryCounts);
}

main();
