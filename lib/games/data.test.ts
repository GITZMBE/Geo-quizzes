import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPoints, fetchRegions } from "./data";

function mockFetchJson(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: () => Promise.resolve(body),
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRegions", () => {
  it("unwraps the .features array from a GeoJSON FeatureCollection", async () => {
    const features = [
      { type: "Feature", properties: { name: "A" }, geometry: { type: "Polygon", coordinates: [] } },
      { type: "Feature", properties: { name: "B" }, geometry: { type: "Polygon", coordinates: [] } },
    ];
    mockFetchJson({ type: "FeatureCollection", features });

    const result = await fetchRegions("/data/fake.json");
    expect(result).toEqual(features);
  });

  it("calls fetch with the given URL", async () => {
    mockFetchJson({ type: "FeatureCollection", features: [] });
    await fetchRegions("/data/some-file.json");
    expect(fetch).toHaveBeenCalledWith("/data/some-file.json");
  });

  it("returns an empty array when there are no features", async () => {
    mockFetchJson({ type: "FeatureCollection", features: [] });
    const result = await fetchRegions("/data/empty.json");
    expect(result).toEqual([]);
  });
});

describe("fetchPoints", () => {
  it("unwraps the .items array from a points envelope", async () => {
    const items = [
      { id: "a", name: "Alpha", lat: 1, lng: 2 },
      { id: "b", name: "Beta", lat: 3, lng: 4 },
    ];
    mockFetchJson({ items });

    const result = await fetchPoints("/data/fake-points.json");
    expect(result).toEqual(items);
  });

  it("returns an empty array when there are no items", async () => {
    mockFetchJson({ items: [] });
    const result = await fetchPoints("/data/empty-points.json");
    expect(result).toEqual([]);
  });
});
