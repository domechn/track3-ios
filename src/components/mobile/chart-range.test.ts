import { describe, expect, it } from "vitest";
import { visibleHistoryIndices } from "./chart-range";

describe("portfolio chart range", () => {
  const days = [0, 10, 40, 80, 120].map((day) => day * 86400);

  it("keeps the first and latest points when the requested range is shorter than the history", () => {
    expect(visibleHistoryIndices(days, 30)).toEqual([3, 4]);
  });

  it("keeps all points for the full range and a single point for a new portfolio", () => {
    expect(visibleHistoryIndices(days, null)).toEqual([0, 1, 2, 3, 4]);
    expect(visibleHistoryIndices([123], 7)).toEqual([0]);
  });
});
