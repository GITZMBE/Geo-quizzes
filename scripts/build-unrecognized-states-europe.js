// Builds public/data/unrecognized_states_europe.json for the "Unofficial
// European States" flags game (github.com/GITZMBE/Geo-quizzes issue #2).
//
// Issue #2 originally asked for a flag game covering de facto states,
// disputed territories, separatist movements, historical states, and
// micronations worldwide — too broad and too politically contestable a list
// to derive automatically (there's no clean, neutral Wikidata class query
// for "unofficial country" the way world_countries.json can lean on Natural
// Earth's already-vetted sovereign-state boundaries). Scoped down, per
// explicit product direction, to a small, well-documented, Europe-only list
// of currently-existing partially-recognized states with their own flag,
// capital, and de facto governed territory:
//   - Kosovo (Q1246) — partially recognized (~100 UN members)
//   - Northern Cyprus (Q23681) — recognized only by Turkey
//   - Transnistria (Q907112) — recognized by no UN member
//   - South Ossetia (Q23427) — recognized by Russia + a handful of states
//   - Abkhazia (Q31354462) — recognized by Russia + a handful of states
// Deliberately excluded: anything tied to an active war/annexation dispute
// (e.g. the Russian-occupied Donetsk/Luhansk "people's republics", Nagorno-
// Karabakh which ceased to exist as a de facto state in 2023) or micronations
// with no real governed territory — those are either too volatile to keep
// accurate or too far from "a state most people would recognize the shape
// of the question for."
//
// Source: Wikidata, via the public SPARQL endpoint — P41 (flag image), P36
// (capital), P625 (coordinate location) for the 5 QIDs above. Flag images
// come back as a commons.wikimedia.org/wiki/Special:FilePath/<file> URL,
// Wikimedia's documented stable hotlink pattern (redirects straight to the
// current upload.wikimedia.org file) — same "reference directly, never
// download" approach as flagcdn.com is used for elsewhere in this codebase,
// and the same source scripts/build-country-coat-of-arms.js uses for P94.
//
// Output shape is plain GeoJSON (Point geometry per state, at its capital's
// coordinates) rather than the "points" envelope, purely so this file
// satisfies lib/games/data.ts's CountryFeature type unmodified and the
// existing components/games/FlagsMode.tsx component can be reused with zero
// changes — see that type's `{ properties: { name, iso2, capital, flagUrl } }`
// shape. `iso2` is NOT a real ISO 3166-1 code (none of these territories
// have one) — it's a short locally-invented identifier, kept only because
// the shared type requires the field; nothing reads it at runtime for this
// game's one mode (flags).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const OUT_PATH = path.join(__dirname, "..", "public", "data", "unrecognized_states_europe.json");

const STATES = [
  { qid: "Q1246", name: "Kosovo", iso2: "XK" }, // "XK" is genuinely used informally (EU, SWIFT) unlike the others below
  { qid: "Q23681", name: "Northern Cyprus", iso2: "NC" },
  { qid: "Q907112", name: "Transnistria", iso2: "PMR" },
  // Wikidata's English label for the capital is "Tskhinval" (the Ossetian
  // form) — overridden to "Tskhinvali", the spelling standard English
  // atlases/media use (from Georgian).
  { qid: "Q23427", name: "South Ossetia", iso2: "RSO", capitalOverride: "Tskhinvali" },
  { qid: "Q31354462", name: "Abkhazia", iso2: "ABK" },
];

function sparql(query) {
  // curl, not node's fetch — same convention as build-country-stats.js /
  // build-country-coat-of-arms.js.
  const text = execFileSync(
    "curl",
    ["-s", "-G", SPARQL_ENDPOINT, "--data-urlencode", `query=${query}`, "-H", "Accept: application/sparql-results+json"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 20 }
  );
  return JSON.parse(text).results.bindings;
}

function parseWktPoint(wkt) {
  // "Point(lng lat)" — SPARQL's default WKT coordinate order is lng then lat.
  const match = wkt.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
  return { lng: Number(match[1]), lat: Number(match[2]) };
}

function main() {
  const values = STATES.map((s) => `wd:${s.qid}`).join(" ");
  const rows = sparql(
    `SELECT ?entity ?flag ?capitalLabel ?coord WHERE {
      VALUES ?entity { ${values} }
      ?entity wdt:P41 ?flag .
      OPTIONAL { ?entity wdt:P36 ?capital . }
      OPTIONAL { ?entity wdt:P625 ?coord . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`
  );

  const byQid = new Map();
  for (const row of rows) {
    const qid = row.entity.value.split("/").pop();
    const existing = byQid.get(qid);
    if (!existing) {
      byQid.set(qid, row);
      continue;
    }
    // Transnistria has two P41 flag values ("(state)" and "(variant)") —
    // prefer the one actually flown by its de facto authorities. The flag
    // value is already URL-encoded (parens as %28/%29), so match that form.
    if (row.flag.value.includes("%28state%29")) byQid.set(qid, row);
  }

  const features = STATES.map((state) => {
    const row = byQid.get(state.qid);
    if (!row) throw new Error(`No Wikidata result for ${state.name} (${state.qid})`);
    const { lng, lat } = parseWktPoint(row.coord.value);
    return {
      type: "Feature",
      properties: {
        name: state.name,
        iso2: state.iso2,
        capital: state.capitalOverride ?? row.capitalLabel.value,
        flagUrl: row.flag.value.replace(/^http:/, "https:"),
      },
      geometry: { type: "Point", coordinates: [lng, lat] },
    };
  });

  const out = {
    type: "FeatureCollection",
    note:
      "5 partially-recognized European states with a real, currently-governed territory, flag, and capital — Kosovo, Northern Cyprus, Transnistria, South Ossetia, Abkhazia. Deliberately excludes anything tied to an active war/annexation dispute and defunct/historical entities. `iso2` is a locally-invented short code, not a real ISO 3166-1 code (none exists for these territories) — kept only to satisfy CountryFeature's shared type shape. Flag images from Wikidata (property P41), capital from P36, coordinates from P625, via scripts/build-unrecognized-states-europe.js.",
    features,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Wrote ${features.length} states to ${OUT_PATH}`);
}

main();
