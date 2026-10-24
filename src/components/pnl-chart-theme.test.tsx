import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import PNLChart from "./pnl-chart";
import { ThemeProvider, useTheme } from "./common/theme";
import { queryPNLChartValue } from "@/middlelayers/charts";
import { ChartResizeContext } from "@/App";

vi.mock("@/middlelayers/charts", () => ({
  queryPNLChartValue: vi.fn(),
  resizeChart: vi.fn(),
  resizeChartWithDelay: vi.fn(),
}));

const barProps = vi.hoisted(() => ({ current: null as null | {
  data: { datasets: { backgroundColor: string }[] };
  options: { scales: { x: { ticks: { display?: boolean } } } };
} }));
vi.mock("react-chartjs-2", () => ({
  Bar: (props: typeof barProps.current) => {
    barProps.current = props;
    return <canvas />;
  },
}));

function ThemeToggle() {
  const { setTheme } = useTheme();
  return <button onClick={() => setTheme("dark")}>Dark</button>;
}

const chart = <PNLChart currency={{ currency: "USD", symbol: "$", rate: 1, alias: "usd" }}
  dateRange={{ start: new Date("2024-04-15"), end: new Date("2024-04-16") }}
  quoteColor="green-up-red-down" />;
const renderChart = () => render(<ThemeProvider defaultTheme="light"><ChartResizeContext.Provider
  value={{ needResize: 0, setNeedResize: vi.fn() }}>
  <ThemeToggle />{chart}
</ChartResizeContext.Provider></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  barProps.current = null;
  vi.mocked(queryPNLChartValue).mockResolvedValue([
    { timestamp: 1713139200000, totalValue: 1000 },
    { timestamp: 1713225600000, totalValue: 1100 },
  ]);
});

it("updates phone P&L bar colors when the theme changes", async () => {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: query.includes("pointer: coarse"), addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  renderChart();
  await waitFor(() => expect(barProps.current?.data.datasets[0].backgroundColor).toBe("#34c759"));
  fireEvent.click(document.querySelector("button")!);
  await waitFor(() => expect(barProps.current?.data.datasets[0].backgroundColor).toBe("#30d158"));
});

it("keeps the desktop P&L bar colors on a theme change", async () => {
  vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  renderChart();
  await waitFor(() => expect(barProps.current?.data.datasets[0].backgroundColor).toBe("rgba(16,185,129,0.8)"));
  fireEvent.click(document.querySelector("button")!);
  await waitFor(() => expect(barProps.current?.data.datasets[0].backgroundColor).toBe("rgba(16,185,129,0.8)"));
});

it("places phone P&L dates below the plot so bars can use its full width", async () => {
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ matches: query.includes("pointer: coarse"), addEventListener: vi.fn(), removeEventListener: vi.fn() }) as unknown as MediaQueryList);
  renderChart();
  await waitFor(() => expect(barProps.current?.data.datasets[0].backgroundColor).toBe("#34c759"));
  expect(barProps.current?.options.scales.x.ticks.display).toBe(false);
  expect(screen.getByText(/Apr 15/)).toBeInTheDocument();
  expect(screen.getByText(/Apr 16/)).toBeInTheDocument();
});
