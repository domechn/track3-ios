import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ProfitSummary from "./profit-summary";

vi.mock("@/middlelayers/charts", () => ({
  calculateTotalProfit: vi.fn().mockResolvedValue({ total: 0 }),
}));

it("selects the latest year within a historical date range", () => {
  render(<ProfitSummary
    dateRange={{ start: new Date(2023, 0, 1), end: new Date(2024, 3, 16) }}
    currency={{ currency: "USD", symbol: "$", rate: 1, alias: "USD" }}
    quoteColor="green-up-red-down"
  />);

  expect(screen.getByRole("combobox", { name: "Select Year 2024" })).toHaveTextContent("2024");
  expect(screen.getByText("Apr")).toBeInTheDocument();
});
