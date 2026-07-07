import { atom } from "recoil";

export type RoundResult = "correct" | "wrong" | null;

export const stockholmGameState = atom({
  key: "stockholmGameState",
  default: {
    order: [] as string[],
    index: 0,
    score: 0,
    lastClicked: null as string | null,
    lastResult: null as RoundResult,
    finished: false,
  },
});

export const swedenTypeAllState = atom({
  key: "swedenTypeAllState",
  default: {
    guessedRanks: [] as number[],
    startedAt: null as number | null,
    finishedAt: null as number | null,
    gaveUp: false,
  },
});

export const swedenClickDotState = atom({
  key: "swedenClickDotState",
  default: {
    order: [] as number[],
    index: 0,
    score: 0,
    lastClicked: null as number | null,
    lastResult: null as RoundResult,
    finished: false,
  },
});

export const swedenProximityState = atom({
  key: "swedenProximityState",
  default: {
    order: [] as number[],
    index: 0,
    totalScore: 0,
    lastGuess: null as { lat: number; lng: number; distanceKm: number; points: number } | null,
    finished: false,
  },
});
