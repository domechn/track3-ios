import { ChartResizeContext } from "@/App";
import {
  queryPNLChartValue,
  resizeChart,
  resizeChartWithDelay,
} from "@/middlelayers/charts";
import {
  CurrencyRateDetail,
  PNLChartData,
  QuoteColor,
  TDateRange,
} from "@/middlelayers/types";
import { positiveNegativeColor } from "@/utils/color";
import { currencyWrapper, simplifyNumber } from "@/utils/currency";
import { glassScaleOptions, glassTooltip } from "@/utils/chart-theme";
import { timeToDateStr } from "@/utils/date";
import { useContext, useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { useDataChangedVersion } from "@/contexts/data-changed";
import { downsampleIndices } from "@/middlelayers/chart-downsample";
import { useTranslation } from "@/i18n";
import { useIsMobile } from "@/components/mobile";
import { useTheme } from "@/components/common/theme";

const chartName = "PNL of Asset";

const App = ({
  currency,
  dateRange,
  quoteColor,
  className,
}: {
  currency: CurrencyRateDetail;
  dateRange: TDateRange;
  quoteColor: QuoteColor;
  className?: string;
}) => {
  const { t, locale } = useTranslation();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const { needResize } = useContext(ChartResizeContext);
  const [pnlChartData, setPnlChartData] = useState<PNLChartData>([]);
  const [chartWidth, setChartWidth] = useState(600);
  const pnlChanges = useMemo(
    () => pnlChartData.slice(1).map((point, index) =>
      point.totalValue - pnlChartData[index].totalValue,
    ),
    [pnlChartData],
  );
  const plottedPNL = useMemo(() => {
    const indices = downsampleIndices([pnlChanges], Math.max(40, Math.floor(chartWidth / 2)));
    let largestGain = -1;
    let largestLoss = -1;
    pnlChanges.forEach((change, index) => {
      if (largestGain < 0 || change > pnlChanges[largestGain]) largestGain = index;
      if (largestLoss < 0 || change < pnlChanges[largestLoss]) largestLoss = index;
    });
    const boundaries = [...new Set([...indices, largestGain - 1, largestLoss - 1]
      .filter((index) => index >= 0))].sort((a, b) => a - b);
    return boundaries.map((index, position) => ({
      change: currencyWrapper(currency)(
        pnlChartData[index + 1].totalValue
        - pnlChartData[position ? boundaries[position - 1] + 1 : 0].totalValue,
      ),
      timestamp: pnlChartData[index + 1].timestamp,
    }));
  }, [pnlChanges, pnlChartData, chartWidth, currency]);

  const rangeKey = useMemo(
    () => `${dateRange.start.getTime()}-${dateRange.end.getTime()}`,
    [dateRange.start, dateRange.end]
  );
  const dataChangedVersion = useDataChangedVersion();

  useEffect(() => {
    let active = true;
    void queryPNLChartValue(dateRange).then((data) => {
      if (active) {
        setPnlChartData(data);
        resizeChartWithDelay(chartName);
      }
    });

    return () => {
      active = false;
    };
  }, [rangeKey, dataChangedVersion]);

  useEffect(() => resizeChart(chartName), [needResize]);

  const options = {
    maintainAspectRatio: false,
    responsive: true,
    animation: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? false : { duration: 350 },
    onResize: (_chart: unknown, size: { width: number }) => setChartWidth(size.width),
    hover: {
      mode: "index",
      intersect: false,
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      title: {
        display: false,
        // text is set for resizing
        text: chartName,
      },
      datalabels: {
        display: false,
      },
      legend: {
        display: false,
      },
      tooltip: {
        ...glassTooltip,
        callbacks: {
          label: (context: { parsed: { y?: number } }) => {
            const yv = context.parsed.y;
            if (!yv) {
              return "";
            }
            const isNegative = yv < 0;

            const v = Math.abs(yv).toLocaleString();
            return (isNegative ? "-" : "") + currency.symbol + v;
          },
        },
      },
    },
    scales: {
      x: {
        display: !isMobile,
        title: {
          display: false,
        },
        ticks: {
          ...glassScaleOptions.ticks,
          display: !isMobile,
          maxRotation: 0,
          minRotation: 0,
          align: "center",
          autoSkip: false,
          callback: function (val: number, index: number) {
            const data = plottedPNL;
            const start = 0;
            const end = data.length - 1;
            // only show start and end date
            if (index === start) {
              return isMobile ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US",
                { month: "short", day: "numeric" }).format(new Date(data[index].timestamp)) : timeToDateStr(data[index].timestamp);
            }

            if (index === end) {
              return isMobile ? new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US",
                { month: "short", day: "numeric" }).format(new Date(data[index].timestamp)) : timeToDateStr(data[index].timestamp);
            }

            return "";
          },
        },
        grid: {
          display: false,
        },
        border: { display: !isMobile },
      },
      y: {
        grace: isMobile ? "8%" : undefined,
        title: {
          display: false,
          text: currency.currency,
        },
        offset: true,
        ticks: {
          ...glassScaleOptions.ticks,
          precision: 2,
          maxTicksLimit: 4,
          callback: (value: any) => {
            return value === 0 ? "0" : simplifyNumber(value);
          },
        },
        grid: {
          ...glassScaleOptions.grid,
        },
        border: { display: !isMobile },
      },
    },
  };

  function formatPositiveLineData() {
    return plottedPNL.map(({ change }) => change < 0 ? undefined : change);
  }

  function formatNegativeLineData() {
    return plottedPNL.map(({ change }) => change >= 0 ? undefined : change);
  }

  function pnlBackgroundColor(val: "positive" | "negative"): string {
    const c = positiveNegativeColor(val === "positive" ? 1 : -1, quoteColor);
    if (!isMobile) {
      return c === "green" ? "rgba(16,185,129,0.8)" : "rgba(244,63,94,0.8)";
    }
    return c === "green"
      ? resolvedTheme === "dark" ? "#30d158" : "#34c759"
      : resolvedTheme === "dark" ? "#ff453a" : "#ff3b30";
  }

  function lineData() {
    return {
      labels: plottedPNL.map((x) => timeToDateStr(x.timestamp)),
      // two datasets for different colors
      datasets: [
        {
          label: "Value",
          data: formatPositiveLineData(),
          stack: "value",
          backgroundColor: pnlBackgroundColor("positive"),
          borderRadius: 4,
          maxBarThickness: 16,
        },
        {
          // !add a blank in label to make the difference between positive and negative, if they are the same, it will cause display issue when rendering the chart
          label: " Value",
          data: formatNegativeLineData(),
          stack: "value",
          backgroundColor: pnlBackgroundColor("negative"),
          borderRadius: 4,
          maxBarThickness: 16,
        },
      ],
    };
  }

  return (
    <div className={className}>
      <div className="overview-pnl-plot">
        <Bar role="img" aria-label={t("pnl.chartSummary")
          .replace("{count}", String(pnlChanges.length))
          .replace("{net}", `${currency.symbol}${currencyWrapper(currency)(pnlChanges.reduce((sum, change) => sum + change, 0)).toFixed(2)}`)}
          options={options as any} data={lineData()} />
      </div>
      {isMobile && plottedPNL.length > 0 && <div className="overview-pnl-dates" aria-hidden="true">
        <span>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US",
          { month: "short", day: "numeric" }).format(new Date(pnlChartData[0].timestamp))}</span>
        <span>{new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US",
          { month: "short", day: "numeric" }).format(new Date(plottedPNL[plottedPNL.length - 1].timestamp))}</span>
      </div>}
      {plottedPNL.length > 0 && <table className="sr-only" aria-label={t("pnl.chartData")}>
        <thead><tr><th scope="col">{t("profitMetrics.date")}</th><th scope="col">{t("history.change")}</th></tr></thead>
        <tbody>{plottedPNL.map(({ change, timestamp }, index) => <tr key={`${timestamp}-${index}`}>
          <td>{timeToDateStr(timestamp)}</td>
          <td>{change < 0 ? "-" : "+"}{currency.symbol}{Math.abs(change).toFixed(2)}</td>
        </tr>)}</tbody>
      </table>}
    </div>
  );
};

export default App;
