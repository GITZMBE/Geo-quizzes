// Merges the scratch outputs from build-swedish-roads-primary.js (and, once
// it exists, build-swedish-roads-secondary.js) into the final
// public/data/swedish_roads.json. Kept as a separate step so the primary
// tier's expensive Overpass/Wikipedia fetch doesn't need to rerun just to
// pick up secondary-tier changes, and vice versa.
const fs = require("fs");
const path = require("path");

const SCRATCH_DIR = path.join(__dirname, "..", ".scratch-swedish-roads");
const PRIMARY_PATH = path.join(SCRATCH_DIR, "swedish_roads_primary.json");
const SECONDARY_PATH = path.join(SCRATCH_DIR, "swedish_roads_secondary.json");
const OUT_PATH = path.join(__dirname, "..", "public", "data", "swedish_roads.json");

const primary = JSON.parse(fs.readFileSync(PRIMARY_PATH, "utf8"));
const secondary = fs.existsSync(SECONDARY_PATH)
  ? JSON.parse(fs.readFileSync(SECONDARY_PATH, "utf8"))
  : { features: [] };

const features = [...primary.features, ...secondary.features];
fs.writeFileSync(OUT_PATH, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`Wrote ${features.length} features to ${OUT_PATH}`);
console.log(`  primary: ${primary.features.length}, secondary: ${secondary.features.length}`);
