import { describe, expect, it } from "vitest";
import { haversineDistanceKm, proximityScore, shuffle } from "./geo";

describe("haversineDistanceKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineDistanceKm({ lat: 59.33, lng: 18.06 }, { lat: 59.33, lng: 18.06 })).toBe(0);
  });

  it("matches the known Stockholm-to-Gothenburg distance (~400km)", () => {
    const stockholm = { lat: 59.3293, lng: 18.0686 };
    const gothenburg = { lat: 57.7089, lng: 11.9746 };
    const km = haversineDistanceKm(stockholm, gothenburg);
    expect(km).toBeGreaterThan(390);
    expect(km).toBeLessThan(410);
  });

  it("matches the known Stockholm-to-New York distance (~6300km)", () => {
    const stockholm = { lat: 59.3293, lng: 18.0686 };
    const newYork = { lat: 40.7128, lng: -74.006 };
    const km = haversineDistanceKm(stockholm, newYork);
    expect(km).toBeGreaterThan(6200);
    expect(km).toBeLessThan(6400);
  });

  it("is symmetric", () => {
    const a = { lat: 10, lng: 20 };
    const b = { lat: -30, lng: 100 };
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 6);
  });

  it("returns close to half the Earth's circumference for antipodal points", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 180 };
    const km = haversineDistanceKm(a, b);
    // Earth's circumference is ~40,075km, so half is ~20,037.5km.
    expect(km).toBeGreaterThan(19900);
    expect(km).toBeLessThan(20100);
  });
});

describe("proximityScore", () => {
  it("returns the max score at distance 0", () => {
    expect(proximityScore(0)).toBe(5000);
  });

  it("decays as distance increases", () => {
    const near = proximityScore(100);
    const far = proximityScore(1000);
    expect(near).toBeGreaterThan(far);
  });

  it("never returns a negative score", () => {
    expect(proximityScore(1_000_000)).toBeGreaterThanOrEqual(0);
  });

  it("decays faster with a smaller decayKm", () => {
    const tightDecay = proximityScore(500, 100);
    const wideDecay = proximityScore(500, 3000);
    expect(tightDecay).toBeLessThan(wideDecay);
  });

  it("rounds to an integer", () => {
    const score = proximityScore(237, 600);
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe("shuffle", () => {
  it("returns an array of the same length", () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(items)).toHaveLength(items.length);
  });

  it("returns the same multiset of elements, just reordered", () => {
    const items = ["a", "b", "c", "d", "e"];
    const shuffled = shuffle(items);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("does not mutate the input array", () => {
    const items = [1, 2, 3];
    const original = [...items];
    shuffle(items);
    expect(items).toEqual(original);
  });

  it("handles an empty array", () => {
    expect(shuffle([])).toEqual([]);
  });

  it("handles a single-element array", () => {
    expect(shuffle([42])).toEqual([42]);
  });
});
