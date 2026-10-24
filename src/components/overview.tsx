import TotalValue from "@/components/total-value-and-change";
import PNL from "@/components/pnl";
import LatestAssetsPercentage from "@/components/latest-assets-percentage";
import TopCoinsRank from "@/components/top-coins-rank";
import Profit from "@/components/profit";
import TopCoinsPercentageChange from "@/components/top-coins-percentage-change";

import {
  CurrencyRateDetail,
  QuoteColor,
  TDateRange,
} from "../middlelayers/types";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDataChangedVersion } from "@/contexts/data-changed";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Button } from "./ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import AssetsPercentageChange from "./assets-percentage-change";
import { StaggerContainer, FadeUp } from "./motion";
import { OverviewLoadingContext } from "@/contexts/overview-loading";
import { useTranslation } from "@/i18n";
import { useIsMobile } from "./mobile";
import { ListRow, MobileCard, MobileSkeleton, SectionHeader } from "./mobile";
import InsightsCard from "./insights-card";
import { WALLET_ANALYZER } from "@/middlelayers/charts-refresh";
import type { WalletAssetsPercentageData } from "@/middlelayers/types";
import { currencyWrapper, prettyNumberToLocaleString } from "@/utils/currency";
import { insertEllipsis } from "@/utils/string";

const MAIN_COMPONENT_COUNT = 4;

function OverviewSourceTeaser({ currency }: { currency: CurrencyRateDetail }) {
  const { t } = useTranslation();
  const version = useDataChangedVersion();
  const [sources, setSources] = useState<WalletAssetsPercentageData>([]);
  useLayoutEffect(() => {
    let active = true;
    void WALLET_ANALYZER.queryWalletAssetsPercentage().then((rows) => {
      if (active) setSources(rows.slice(0, 3));
    });
    return () => { active = false; };
  }, [version]);
  return <>
    <SectionHeader>{t("overview.sources")}</SectionHeader>
    <MobileCard className="overview-source-teaser">
      {sources.map((source) => <ListRow key={source.wallet} className="overview-source-row" href="#/wallets"
        value={<span className="overview-source-value ios-money">
          <strong>{currency.symbol + prettyNumberToLocaleString(currencyWrapper(currency)(source.value))}</strong>
          <span>{source.percentage.toFixed(1)}%</span>
        </span>}>
        {source.walletAlias ?? insertEllipsis(source.wallet, 18)}
      </ListRow>)}
      <ListRow href="#/settings/configuration">{t("overview.manageSources")}</ListRow>
    </MobileCard>
  </>;
}

const App = ({
  currency,
  dateRange,
  quoteColor,
}: {
  currency: CurrencyRateDetail;
  dateRange: TDateRange;
  quoteColor: QuoteColor;
}) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isShowMore, setIsShowMore] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState(true);
  const loadedCountRef = useRef(0);
  const rangeKey = useMemo(
    () => `${dateRange.start.getTime()}-${dateRange.end.getTime()}`,
    [dateRange.start, dateRange.end],
  );
  const dataChangedVersion = useDataChangedVersion();
  useLayoutEffect(() => {
    setPageLoading(true);
    loadedCountRef.current = 0;
  }, [rangeKey, dataChangedVersion]);

  const reportLoaded = useCallback(() => {
    loadedCountRef.current += 1;
    if (loadedCountRef.current >= MAIN_COMPONENT_COUNT) {
      setPageLoading(false);
    }
  }, []);

  const loadingContextValue = useMemo(() => ({ reportLoaded }), [reportLoaded]);
  const moreContent = <StaggerContainer className="space-y-3">
    <FadeUp><AssetsPercentageChange dateRange={dateRange} /></FadeUp>
    <FadeUp><TopCoinsRank dateRange={dateRange} /></FadeUp>
    <FadeUp><TopCoinsPercentageChange dateRange={dateRange} /></FadeUp>
  </StaggerContainer>;

  return (
    <OverviewLoadingContext.Provider value={loadingContextValue}>
      <div className="relative min-h-[400px]" aria-busy={pageLoading}>
        {!isMobile && <h1 className="sr-only">{t("overview.h1")}</h1>}
        <Collapsible open={isShowMore} onOpenChange={setIsShowMore}>
          <StaggerContainer className="space-y-3 overview-sections">
            <div className="grid gap-5 grid-cols-2 overview-main-grid">
              <FadeUp className="col-span-2 h-full md:col-span-1">
                <TotalValue
                  currency={currency}
                  dateRange={dateRange}
                  quoteColor={quoteColor}
                />
              </FadeUp>
              <FadeUp className="col-span-2 h-full md:col-span-1">
                {isMobile && <SectionHeader>{t("overview.performance")}</SectionHeader>}
                <PNL
                  currency={currency}
                  dateRange={dateRange}
                  quoteColor={quoteColor}
                />
              </FadeUp>
            </div>
            <FadeUp>
              {isMobile && <SectionHeader>{t("overview.allocation")}</SectionHeader>}
              <LatestAssetsPercentage
                currency={currency}
                dateRange={dateRange}
              />
            </FadeUp>
            <FadeUp>
              {isMobile && <SectionHeader>{t("overview.movers")}</SectionHeader>}
              <Profit
                currency={currency}
                dateRange={dateRange}
                quoteColor={quoteColor}
              />
            </FadeUp>
            {isMobile && <FadeUp><MobileCard className="overview-more-disclosure">
              <CollapsibleTrigger asChild>
                <button type="button" className="mobile-list-row" aria-label={`${isShowMore ? t("common.showLess") : t("common.showMore")}: ${isShowMore ? t("overview.lessAnalytics") : t("overview.moreAnalytics")}`}>
                  <span className="mobile-list-label">{isShowMore ? t("overview.lessAnalytics") : t("overview.moreAnalytics")}</span>
                  {isShowMore ? <ChevronUpIcon aria-hidden="true" /> : <ChevronDownIcon aria-hidden="true" />}
                </button>
              </CollapsibleTrigger>
            </MobileCard></FadeUp>}
            {isMobile && <CollapsibleContent>{moreContent}</CollapsibleContent>}
            {isMobile && <FadeUp><InsightsCard currency={currency} overview /></FadeUp>}
            {isMobile && <FadeUp><OverviewSourceTeaser currency={currency} /></FadeUp>}
          </StaggerContainer>
          {!isMobile && <CollapsibleTrigger asChild className="my-3 w-full">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground border-t border-border/40 rounded-none hover:bg-muted/50"
            >
              {isShowMore ? t("common.showLess") : t("common.showMore")}
              {isShowMore ? <ChevronUpIcon className="ml-1 h-4 w-4" /> : <ChevronDownIcon className="ml-1 h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>}
          {!isMobile && <CollapsibleContent>{moreContent}</CollapsibleContent>}
        </Collapsible>
        {pageLoading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/65 px-4 backdrop-blur-md overview-loading"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {isMobile ? <div className="overview-skeleton" aria-hidden="true">
              <MobileSkeleton className="h-4 w-24" />
              <MobileSkeleton className="mt-4 h-14 w-64 max-w-full" />
              <MobileSkeleton className="mt-3 h-7 w-36 rounded-full" />
              <MobileSkeleton className="mt-9 h-44 w-full" />
              <MobileSkeleton className="mt-4 h-11 w-full" />
              <span className="sr-only">{t("loading.overview")}</span>
            </div> : <div className="glass-subtle flex max-w-sm flex-col items-center gap-3 rounded-xl px-5 py-4 text-center">
              <div className="h-2 w-24 rounded-full bg-primary/20">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-primary/70 motion-reduce:animate-none" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("loading.overview")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("loading.overviewDesc")}
                </p>
              </div>
            </div>}
            {isMobile && <span className="sr-only">{t("loading.overview")}</span>}
          </div>
        )}
      </div>
    </OverviewLoadingContext.Provider>
  );
};

export default App;
