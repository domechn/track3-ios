import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { queryLatestAssets, queryRealTimeAssetsValue } from "@/middlelayers/charts";
import { MobileHeaderTotal } from "./header-total";

vi.mock("@/middlelayers/charts", () => ({
  queryLatestAssets: vi.fn(),
  queryRealTimeAssetsValue: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("updates the Pro header total when live portfolio prices change", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.mocked(queryLatestAssets).mockResolvedValue([]);
  vi.mocked(queryRealTimeAssetsValue)
    .mockResolvedValueOnce([{ value: 100 }] as never)
    .mockResolvedValueOnce([{ value: 120 }] as never);
  render(<MobileHeaderTotal live currency={{ currency: "USD", symbol: "$", rate: 1, alias: "usd" }} />);
  await act(async () => { await Promise.resolve(); });
  expect(screen.getByLabelText("Total")).toHaveTextContent("$100");
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(screen.getByLabelText("Total")).toHaveTextContent("$120");
});
