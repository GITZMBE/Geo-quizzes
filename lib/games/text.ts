const MIN_AUTOCOMPLETE_CHARS = 5;

// Same "unambiguous prefix" rule as Sweden's TypeAllMode (kept separate
// there since it's the only consumer at the time), factored out here
// because CapitalsMode/FlagsMode both need it against a different
// candidate list (capitals, country names) each.
export function getAutocompleteMatch(input: string, candidates: string[]): string | null {
  if (input.length < MIN_AUTOCOMPLETE_CHARS) return null;
  const lower = input.toLowerCase();
  const matches = candidates.filter((c) => c.toLowerCase().startsWith(lower));
  return matches.length === 1 ? matches[0] : null;
}

// Road designations ("AB 543", "E4") need looser matching than a plain
// .toLowerCase() equality check — stripping whitespace entirely (not just
// collapsing it) means "ab543"/"AB 543"/"AB  543" all count as the same
// answer, since the space between a county letter and its number isn't
// meaningful to the player typing it.
export function normalizeRoadAnswer(input: string): string {
  return input.toLowerCase().replace(/\s+/g, "");
}
