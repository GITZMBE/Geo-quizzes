import { describe, expect, it } from "vitest";
import { getHigherLowerState, getRoundState } from "./gameAtoms";

// getRoundState/getHigherLowerState cache their atoms in a module-level Map
// keyed by string, so each test below uses its own unique key to avoid
// cross-test pollution within this file (the cache isn't reset between
// tests — that's the exact caching behavior under test).

describe("getRoundState", () => {
  it("returns the same atom instance for the same key", () => {
    const a = getRoundState("test-round-key-a");
    const b = getRoundState("test-round-key-a");
    expect(a).toBe(b);
  });

  it("returns different atom instances for different keys", () => {
    const a = getRoundState("test-round-key-b1");
    const b = getRoundState("test-round-key-b2");
    expect(a).not.toBe(b);
  });

  it("gives a fresh atom the correct default shape", () => {
    const state = getRoundState("test-round-key-c").get();
    expect(state).toEqual({
      order: [],
      index: 0,
      score: 0,
      lastAnswer: null,
      lastResult: null,
      wrongGuesses: [],
      correctGuesses: [],
      finished: false,
    });
  });

  it("keeps mutations to one key's atom isolated from another key", () => {
    const a = getRoundState("test-round-key-d1");
    const b = getRoundState("test-round-key-d2");
    a.set({ ...a.get(), score: 42 });
    expect(a.get().score).toBe(42);
    expect(b.get().score).toBe(0);
  });
});

describe("getHigherLowerState", () => {
  it("returns the same atom instance for the same key", () => {
    const a = getHigherLowerState("test-hl-key-a");
    const b = getHigherLowerState("test-hl-key-a");
    expect(a).toBe(b);
  });

  it("returns different atom instances for different keys", () => {
    const a = getHigherLowerState("test-hl-key-b1");
    const b = getHigherLowerState("test-hl-key-b2");
    expect(a).not.toBe(b);
  });

  it("gives a fresh atom the correct default shape", () => {
    const state = getHigherLowerState("test-hl-key-c").get();
    expect(state).toEqual({
      leftId: null,
      rightId: null,
      seenIds: [],
      score: 0,
      lastResult: null,
      finished: false,
    });
  });
});
