const fs = require("fs");

const cities = JSON.parse(
  fs.readFileSync("public/data/sweden_largest_cities.json", "utf8")
).items;

const raw = fs.readFileSync(
  "C:/Users/Lucand/AppData/Local/Temp/se_geonames/SE.txt",
  "utf8"
);
const rows = raw.split("\n").filter(Boolean).map((line) => {
  const c = line.split("\t");
  return {
    name: c[1],
    asciiname: c[2],
    altnames: c[3] ? c[3].split(",") : [],
    lat: parseFloat(c[4]),
    lng: parseFloat(c[5]),
    featureClass: c[6],
    featureCode: c[7],
    population: parseInt(c[14] || "0", 10),
  };
}).filter((r) => r.featureClass === "P");

function norm(s) {
  return s
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]/g, "");
}

const byNormName = new Map();
for (const r of rows) {
  const keys = [r.name, r.asciiname, ...r.altnames].filter(Boolean);
  for (const k of keys) {
    const nk = norm(k);
    const existing = byNormName.get(nk);
    if (!existing || r.population > existing.population) {
      byNormName.set(nk, r);
    }
  }
}

// Manual overrides for localities without a direct GeoNames PPL match.
// Best available proxy coordinates (documented, not fabricated):
// - Västerhaninge: no PPL entry in this dump, using "Västerhaninge socken" (parish) coords.
// - Nordöstra Göteborg ("Northeast Gothenburg"): SCB statistical locality with no single
//   GeoNames entry; using Angered, its largest constituent district, as a proxy center.
const OVERRIDES = {
  "Västerhaninge": { lat: 59.09026, lng: 18.0461 },
  "Nordöstra Göteborg": { lat: 57.78628, lng: 12.09852 },
};

const results = [];
const unmatched = [];

for (const city of cities) {
  const parts = city.name.split(/\s+och\s+|\s*\/\s*|-/i).map((p) => p.trim());
  let match = byNormName.get(norm(city.name));

  if (!match) {
    for (const part of parts) {
      match = byNormName.get(norm(part));
      if (match) break;
    }
  }

  if (match) {
    results.push({ ...city, lat: match.lat, lng: match.lng });
  } else if (OVERRIDES[city.name]) {
    results.push({ ...city, ...OVERRIDES[city.name] });
  } else {
    unmatched.push(city.name);
    results.push({ ...city, lat: null, lng: null });
  }
}

console.log("Matched:", results.length - unmatched.length, "/", cities.length);
console.log("Unmatched:", JSON.stringify(unmatched));

fs.writeFileSync(
  "C:/Users/Lucand/AppData/Local/Temp/matched_cities.json",
  JSON.stringify(results, null, 2)
);
