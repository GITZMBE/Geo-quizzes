export type GameMode = {
  slug: string;
  name: string;
  scoreType: "POINTS" | "TIME_MS";
  // Set on the shared "Practice" mode every game gets (issue #12) — browse
  // every question and reveal its answer at your own pace. No score is ever
  // submitted for it, so `scoreType` is otherwise meaningless here (kept
  // "POINTS" rather than making it optional, since GameMode.scoreType is
  // relied on elsewhere as always-present); `practice: true` is what
  // Leaderboard/GameShell-adjacent code should actually check.
  practice?: boolean;
};

// Appended to every game's `modes` array below — see the PracticeMode
// component for why one generic mode works regardless of question type.
const PRACTICE_MODE: GameMode = { slug: "practice", name: "Practice", scoreType: "POINTS", practice: true };

export type GameDefinition = {
  slug: string;
  name: string;
  description: string;
  dataFile: string;
  modes: GameMode[];
};

export const GAMES: GameDefinition[] = [
  {
    slug: "stockholm-stadsdelar",
    name: "Stockholm Districts",
    description:
      "A district is named — click its outline on the map of Stockholm.",
    dataFile: "/data/stockholm_stadsdelar.json",
    modes: [{ slug: "click-district", name: "Click the district", scoreType: "POINTS" }, PRACTICE_MODE],
  },
  {
    slug: "sweden-cities",
    name: "Sweden's Biggest Cities",
    description:
      "Name, locate, or guess the location of Sweden's top 100 largest cities.",
    dataFile: "/data/sweden_largest_cities.json",
    modes: [
      { slug: "type-all", name: "Type them all", scoreType: "TIME_MS" },
      { slug: "click-dot", name: "Click the city", scoreType: "POINTS" },
      { slug: "proximity", name: "Guess the location", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "world-cities",
    name: "Five Cities Across the World",
    description:
      "Five of the world's biggest cities, one at a time — click where on the globe you think each one is.",
    dataFile: "/data/world_largest_cities.json",
    modes: [{ slug: "proximity", name: "Guess the location", scoreType: "POINTS" }, PRACTICE_MODE],
  },
  {
    slug: "us-states",
    name: "US States",
    description: "A state is named — click its outline on the map.",
    dataFile: "/data/us_states.json",
    modes: [{ slug: "click-state", name: "Click the state", scoreType: "POINTS" }, PRACTICE_MODE],
  },
  {
    slug: "world-countries",
    name: "List All Countries",
    description: "Type the name of every country in the world.",
    dataFile: "/data/world_countries.json",
    modes: [{ slug: "type-all", name: "Type them all", scoreType: "TIME_MS" }, PRACTICE_MODE],
  },
  {
    slug: "countries-africa",
    name: "Countries of Africa",
    description: "Learn Africa's countries, capitals, and flags.",
    dataFile: "/data/countries_africa.json",
    modes: [
      { slug: "countries", name: "Countries", scoreType: "POINTS" },
      { slug: "capitals", name: "Capitals", scoreType: "POINTS" },
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "countries-asia",
    name: "Countries of Asia",
    description: "Learn Asia's countries, capitals, and flags.",
    dataFile: "/data/countries_asia.json",
    modes: [
      { slug: "countries", name: "Countries", scoreType: "POINTS" },
      { slug: "capitals", name: "Capitals", scoreType: "POINTS" },
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "countries-europe",
    name: "Countries of Europe",
    description: "Learn Europe's countries, capitals, and flags.",
    dataFile: "/data/countries_europe.json",
    modes: [
      { slug: "countries", name: "Countries", scoreType: "POINTS" },
      { slug: "capitals", name: "Capitals", scoreType: "POINTS" },
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "countries-north-america",
    name: "Countries of North America",
    description: "Learn North America's countries, capitals, and flags.",
    dataFile: "/data/countries_north-america.json",
    modes: [
      { slug: "countries", name: "Countries", scoreType: "POINTS" },
      { slug: "capitals", name: "Capitals", scoreType: "POINTS" },
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "countries-south-america",
    name: "Countries of South America",
    description: "Learn South America's countries, capitals, and flags.",
    dataFile: "/data/countries_south-america.json",
    modes: [
      { slug: "countries", name: "Countries", scoreType: "POINTS" },
      { slug: "capitals", name: "Capitals", scoreType: "POINTS" },
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "countries-oceania",
    name: "Countries of Oceania",
    description: "Learn Oceania's countries, capitals, and flags.",
    dataFile: "/data/countries_oceania.json",
    modes: [
      { slug: "countries", name: "Countries", scoreType: "POINTS" },
      { slug: "capitals", name: "Capitals", scoreType: "POINTS" },
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "swedish-roads",
    name: "Swedish Roads",
    description: "A road's route is highlighted on the map — type its route number.",
    dataFile: "/data/swedish_roads.json",
    modes: [
      { slug: "all", name: "All roads", scoreType: "POINTS" },
      { slug: "motorways", name: "Motorways", scoreType: "POINTS" },
      { slug: "national-roads", name: "National roads", scoreType: "POINTS" },
      { slug: "county-roads", name: "County roads", scoreType: "POINTS" },
      { slug: "county-roads-secondary", name: "Secondary county roads", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "city-streets",
    name: "Guess the City",
    description:
      "Only a major city's street network is shown — no labels, no borders. Type which city it is.",
    dataFile: "/data/city_streets.json",
    modes: [{ slug: "streets", name: "Street pattern", scoreType: "POINTS" }, PRACTICE_MODE],
  },
  {
    slug: "higher-or-lower",
    name: "Higher or Lower",
    description:
      "A reference country is shown with its value — is the next country's higher or lower?",
    dataFile: "/data/country_stats.json",
    // No PRACTICE_MODE here (issue #12): this game's round shape is an
    // open-ended streak comparing two countries at a time, not a fixed set
    // of "question, answer" pairs — there's no single per-item answer to
    // browse to/reveal, unlike every other game's modes.
    modes: [
      { slug: "population", name: "Population", scoreType: "POINTS" },
      { slug: "area", name: "Area", scoreType: "POINTS" },
    ],
  },
  // The 6 categories below were originally one game ("Unofficial States &
  // Territories", modes keyed by category) — split into separate games per
  // issue #7. Each game's slug doubles as its category value in
  // unofficial_states.json/unofficial_states_borders.json (see
  // UnofficialStatesGamePage), and each gets a "map" mode alongside the
  // original "flags" mode — "map" stays registered even for a category
  // with zero border entities today (Micronations) so the button just
  // starts appearing once that category gains real border data, without a
  // registry change; see scripts/build-unofficial-states-borders.js for
  // exactly which entities have one and why the rest don't.
  {
    slug: "de-facto-states",
    name: "De Facto States",
    description:
      "Breakaway territories that function independently but aren't widely recognized — guess the flag, or the shape on the map.",
    dataFile: "/data/unofficial_states.json",
    modes: [
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      { slug: "map", name: "Map", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "autonomous-territories",
    name: "Autonomous Territories",
    description:
      "Recognized as part of a sovereign state, but with their own flag and real self-government — guess the flag, or the shape on the map.",
    dataFile: "/data/unofficial_states.json",
    modes: [
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      { slug: "map", name: "Map", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "disputed-territories",
    name: "Disputed Territories",
    description: "Contested between multiple claimants — guess the flag, or the shape on the map.",
    dataFile: "/data/unofficial_states.json",
    modes: [
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      { slug: "map", name: "Map", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "separatist-movements",
    name: "Separatist Movements",
    description:
      "Political movements seeking independence, shown by their own flag — guess the flag, or the shape on the map.",
    dataFile: "/data/unofficial_states.json",
    modes: [
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      { slug: "map", name: "Map", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "historical-states",
    name: "Historical States",
    description:
      "20th-century states that no longer exist — guess the flag, or the shape on the map.",
    dataFile: "/data/unofficial_states.json",
    modes: [
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      { slug: "map", name: "Map", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "micronations",
    name: "Micronations",
    description:
      "Self-declared, unrecognized \"countries\" with no real territory — guess the flag.",
    dataFile: "/data/unofficial_states.json",
    modes: [
      { slug: "flags", name: "Flags", scoreType: "POINTS" },
      { slug: "map", name: "Map", scoreType: "POINTS" },
      PRACTICE_MODE,
    ],
  },
  {
    slug: "national-coat-of-arms",
    name: "National Coat of Arms",
    description:
      "A country's coat of arms is shown — type which country it belongs to.",
    dataFile: "/data/country_coat_of_arms.json",
    modes: [{ slug: "coat-of-arms", name: "Coat of Arms", scoreType: "POINTS" }, PRACTICE_MODE],
  },
];

export function getGame(slug: string): GameDefinition | undefined {
  return GAMES.find((g) => g.slug === slug);
}
