import { describe, expect, it } from "vitest";
import { GAMES, getGame } from "./registry";

const VALID_SCORE_TYPES = new Set(["POINTS", "TIME_MS"]);

describe("GAMES registry shape", () => {
  it("has at least one game", () => {
    expect(GAMES.length).toBeGreaterThan(0);
  });

  it("has no duplicate game slugs", () => {
    const slugs = GAMES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every game at least one mode", () => {
    for (const game of GAMES) {
      expect(game.modes.length, `${game.slug} has no modes`).toBeGreaterThan(0);
    }
  });

  it("has no duplicate mode slugs within a single game", () => {
    for (const game of GAMES) {
      const modeSlugs = game.modes.map((m) => m.slug);
      expect(new Set(modeSlugs).size, `${game.slug} has duplicate mode slugs`).toBe(modeSlugs.length);
    }
  });

  it("gives every mode a valid scoreType", () => {
    for (const game of GAMES) {
      for (const mode of game.modes) {
        expect(
          VALID_SCORE_TYPES.has(mode.scoreType),
          `${game.slug}/${mode.slug} has invalid scoreType "${mode.scoreType}"`
        ).toBe(true);
      }
    }
  });

  it("points every game's dataFile at /data/", () => {
    for (const game of GAMES) {
      expect(game.dataFile.startsWith("/data/"), `${game.slug}'s dataFile "${game.dataFile}" doesn't start with /data/`).toBe(
        true
      );
    }
  });

  it("gives every game a non-empty name and description", () => {
    for (const game of GAMES) {
      expect(game.name.length, `${game.slug} has an empty name`).toBeGreaterThan(0);
      expect(game.description.length, `${game.slug} has an empty description`).toBeGreaterThan(0);
    }
  });
});

describe("getGame", () => {
  it("finds a game by its exact slug", () => {
    const game = getGame("us-states");
    expect(game).toBeDefined();
    expect(game?.slug).toBe("us-states");
  });

  it("returns undefined for a slug that doesn't exist", () => {
    expect(getGame("not-a-real-game-slug")).toBeUndefined();
  });
});
