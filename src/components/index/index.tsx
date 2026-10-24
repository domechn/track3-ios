import {
  Chart as ChartJS,
  registerables,
  CategoryScale,
  LinearScale,
  PointElement,
  ArcElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RefreshData from "../refresh-data";
import ChartDataLabels from "chartjs-plugin-datalabels";
import PageWrapper from "../page-wrapper";
import DatePicker from "../date-picker";
import RealTimeTotalValue from "../realtime-total-value";
import Sidebar from "../sidebar";
import { AnimatedPage } from "../motion";
import PageLoadingOverlay from "../page-loading-overlay";
import AutoBackupIndicator from "../auto-backup-indicator";
import SyncStatusIndicator from "../sync-status-indicator";
import "./index.css";
import { Route, Routes, HashRouter, Outlet, Navigate, useLocation, useNavigate, useOutletContext } from "react-router-dom";

import { CurrencyRateDetail, QuoteColor } from "@/middlelayers/types";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  getAvailableDates,
  queryLastRefreshAt,
  getDataFingerprint,
} from "@/middlelayers/charts";
import {
  queryPreferCurrency,
  getLicenseIfIsPro,
  getInitialQueryDateRange,
  getQuoteColor,
  getDefaultCurrencyRate,
  getConfiguration,
} from "@/middlelayers/configuration";
import React from "react";
import { Progress } from "../ui/progress";
import {
  autoBackupHistoricalData,
  autoImportHistoricalData,
} from "@/middlelayers/data";
import { DateRange } from "react-day-picker";
import { format, isValid, parseISO } from "date-fns";
import { invalidateCacheGroups } from "@/middlelayers/datafetch/utils/cache";
import { CACHE_GROUP_KEYS } from "@/middlelayers/consts";
import { APP_SOFT_REFRESH_EVENT } from "@/utils/hook";
import { ASSISTANT_APP_ACTION_EVENT, CURRENT_DATE_RANGE_KEY, DATE_RANGE_KEY, validateActionArgs } from "@/middlelayers/ai/actions";
import { ChartResizeContext } from "@/App";
import { useTranslation } from "@/i18n";
import { DataChangedContext } from "@/contexts/data-changed";
import { processAlerts } from "@/middlelayers/alerts";
import { deliverAlerts, formatAlert } from "@/middlelayers/alert-notifications";
import { syncRuntime } from "@/middlelayers/sync/runtime";
import { toast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { markIOSReady } from "@/utils/ios-ready";
import { InsetGroup, ListRow, MobilePage, PullToRefresh, useIsMobile } from "@/components/mobile";
import { MobileNavigation, routeTitle, tabForPath, tabRoots } from "@/components/mobile/navigation";
import { useAlertBadge } from "@/components/use-alert-badge";
import { MobileHeaderTotal } from "@/components/mobile/header-total";
import { ChevronLeftIcon } from "@radix-ui/react-icons";

const Setting = React.lazy(() => import("../settings"));
const HistoricalData = React.lazy(() => import("../historical-data"));
const Overview = React.lazy(() => import("../overview"));
const Comparison = React.lazy(() => import("../comparison"));
const Rebalance = React.lazy(() => import("../rebalance"));
const GoalsAlerts = React.lazy(() => import("../goals-alerts"));
const WalletAnalysis = React.lazy(() => import("../wallet-analytics"));
const CoinAnalysis = React.lazy(() => import("../coin-analytics"));
const Configuration = React.lazy(() => import("@/components/configuration"));
const DataManagement = React.lazy(() => import("@/components/data-management"));
const SystemInfo = React.lazy(() => import("@/components/system-info"));
const ChatPage = React.lazy(() => import("@/components/assistant/chat-page"));
const AssistantSettings = React.lazy(
  () => import("@/components/settings/assistant"),
);
const SyncSettingsPage = React.lazy(() => import("@/components/settings/sync"));
const Summary = React.lazy(() => import("../summary"));
const Appearance = React.lazy(() => import("../appearance"));
const CostBasis = React.lazy(() => import("../cost-basis"));

ChartJS.register(
  ...registerables,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  ChartDataLabels,
);

export const RefreshButtonLoadingContext = React.createContext<{
  buttonLoading: boolean;
  setButtonLoading: React.Dispatch<React.SetStateAction<boolean>>;
  progress: number;
  setProgress: React.Dispatch<React.SetStateAction<number>>;
  refreshAction: React.MutableRefObject<(() => Promise<void>) | null>;
}>(null as any);

function TopBar({
  mobile,
  isProUser,
  quoteColor,
  currentCurrency,
  availableDates,
  dateRange,
  onDatePickerValueChange,
  lastRefreshAt,
  onRefreshSuccess,
  compactTitle,
  refreshAction,
  onBack,
  overview,
}: {
  mobile: boolean;
  isProUser: boolean;
  quoteColor: QuoteColor;
  currentCurrency: CurrencyRateDetail;
  availableDates: Date[];
  dateRange: DateRange | undefined;
  onDatePickerValueChange: (
    selectedTimes: number,
    nextDateRange: DateRange | undefined,
  ) => void;
  lastRefreshAt?: string;
  onRefreshSuccess: () => void;
  compactTitle?: string;
  refreshAction: React.MutableRefObject<(() => Promise<void>) | null>;
  onBack?: () => void;
  overview: boolean;
}) {
  const { t } = useTranslation();
  const [refreshButtonLoading, setRefreshButtonLoading] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [configuredSource, setConfiguredSource] = useState(false);
  useEffect(() => {
    if (!mobile || !overview || availableDates.length > 0) return;
    let active = true;
    void getConfiguration().then((config) => {
      if (!active) return;
      const chains = ["erc20", "sol", "btc", "doge", "trc20", "ton", "sui"] as const;
      setConfiguredSource(Boolean(
        config?.others?.length || config?.exchanges?.some((exchange) => exchange.active !== false) ||
        config?.stockConfig?.brokers?.some((broker) => broker.active !== false) ||
        chains.some((chain) => config?.[chain]?.addresses?.some((address) =>
          typeof address === "string" || address.active !== false)),
      ));
    }).catch(() => { if (active) setConfiguredSource(false); });
    return () => { active = false; };
  }, [mobile, overview, availableDates.length]);
  const showActions = !mobile || (overview && (availableDates.length > 0 || configuredSource));

  return (
    <div id="app-top-bar" className={`sticky top-0 z-10 glass-subtle border-b relative${mobile ? ` mobile-topbar ${onBack ? " mobile-topbar-back" : " mobile-topbar-root"}${compactTitle && !onBack ? " mobile-topbar-collapsed" : ""}` : ""}`}>
      <div className="flex h-12 items-center px-4">
        {mobile && onBack && <button type="button" className="mobile-back mobile-header-back"
          onClick={onBack} aria-label={t("common.back", "Back")}>
          <ChevronLeftIcon aria-hidden="true" />{t("common.back", "Back")}
        </button>}
        {compactTitle && <span className={`mobile-compact-title${overview ? " mobile-overview-compact-title" : ""}`}>{compactTitle}</span>}
        {(!mobile || compactTitle) && !(mobile && onBack && compactTitle) &&
          <MobileHeaderTotal currency={currentCurrency} live={isProUser}
            range={overview && dateRange?.from && dateRange.to ? { start: dateRange.from, end: dateRange.to } : undefined} />}
        {isProUser && !mobile && (
          <div className="mr-4">
            <RealTimeTotalValue
              quoteColor={quoteColor}
              currency={currentCurrency}
            />
          </div>
        )}
        <div className="ml-auto flex items-center space-x-3">
          {(!mobile || (overview && availableDates.length > 0)) && <DatePicker
            availableDates={availableDates}
            value={dateRange}
            onDateChange={onDatePickerValueChange}
          />}
          {showActions && <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <RefreshButtonLoadingContext.Provider
                    value={{
                      buttonLoading: refreshButtonLoading,
                      setButtonLoading: setRefreshButtonLoading,
                      progress: refreshProgress,
                      setProgress: setRefreshProgress,
                      refreshAction,
                    }}
                  >
                    <RefreshData
                      loading={refreshButtonLoading}
                      afterRefresh={(success) => {
                        if (success) {
                          onRefreshSuccess();
                        }
                      }}
                    />
                  </RefreshButtonLoadingContext.Provider>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {lastRefreshAt
                    ? t("topbar.lastRefreshAt") + lastRefreshAt
                    : t("topbar.neverRefreshBefore")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>}
        </div>
      </div>
      {refreshProgress > 0 && refreshButtonLoading && (
        <div className="absolute left-0 right-0 top-full z-20 flex items-center justify-center pt-1 pointer-events-none">
          <Progress value={refreshProgress} className="w-[80%]" />
        </div>
      )}
    </div>
  );
}

function RouteLoadingFallback({ hidden }: { hidden: boolean }) {
  const { t } = useTranslation();
  if (hidden) {
    return null;
  }

  return (
    <PageLoadingOverlay
      title={t("loading.route")}
      description={t("loading.routeDesc")}
    />
  );
}

type LayoutProps = {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  initializing: boolean;
  isProUser: boolean;
  quoteColor: QuoteColor;
  currentCurrency: CurrencyRateDetail;
  availableDates: Date[];
  dateRange: DateRange | undefined;
  onDatePickerValueChange: (
    selectedTimes: number,
    nextDateRange: DateRange | undefined,
  ) => void;
  lastRefreshAt?: string;
  onRefreshSuccess: () => void;
};

function Layout({
  sidebarCollapsed,
  onSidebarToggle,
  initializing,
  isProUser,
  quoteColor,
  currentCurrency,
  availableDates,
  dateRange,
  onDatePickerValueChange,
  lastRefreshAt,
  onRefreshSuccess,
}: LayoutProps) {
  const { t } = useTranslation();
  const mobile = useIsMobile();
  const sidebarWidth = sidebarCollapsed ? 52 : 200;
  const unread = useAlertBadge();
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = tabForPath(location.pathname);
  const routePath = location.pathname + location.search;
  const rootPath = tabRoots[currentTab];
  const tabStacks = useRef<Record<"overview" | "history" | "analytics" | "more", string[]>>({
    overview: [tabRoots.overview], history: [tabRoots.history],
    analytics: [tabRoots.analytics], more: [tabRoots.more],
  });
  const stack = tabStacks.current[currentTab];
  if (stack.at(-1) !== routePath) {
    const existing = stack.indexOf(routePath);
    if (existing >= 0) stack.splice(existing + 1);
    else stack.push(routePath);
  }
  const backPath = stack.at(-2) ?? rootPath;
  const canGoBack = routePath !== rootPath;
  const previousRoute = useRef({ tab: currentTab, path: routePath });
  const tabScroll = useRef<Record<"overview" | "history" | "analytics" | "more", number>>({
    overview: 0, history: 0, analytics: 0, more: 0,
  });
  const tabPaths = useRef<Record<"overview" | "history" | "analytics" | "more", string>>({ ...tabRoots });
  const tabSwitchCaptured = useRef(false);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const refreshAction = useRef<(() => Promise<void>) | null>(null);
  useLayoutEffect(() => {
    const previous = previousRoute.current;
    if (previous.tab === currentTab && previous.path === routePath) return;
    const switchingTabs = previous.tab !== currentTab;
    if (switchingTabs && !tabSwitchCaptured.current) tabScroll.current[previous.tab] = window.scrollY;
    tabSwitchCaptured.current = false;
    const target = switchingTabs && tabPaths.current[currentTab] === routePath
      ? tabScroll.current[currentTab] : 0;
    const restore = () => window.scrollTo(0, target);
    restore();
    const main = document.getElementById("app-main-content");
    const observer = target > 0 && main && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
        restore();
        if (Math.abs(window.scrollY - target) < 2) observer?.disconnect();
      }) : null;
    if (main && observer) observer.observe(main);
    tabPaths.current[currentTab] = routePath;
    previousRoute.current = { tab: currentTab, path: routePath };
    return () => observer?.disconnect();
  }, [currentTab, routePath]);
  useEffect(() => {
    const update = () => setHeaderCollapsed(window.scrollY > 64);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [location.pathname]);

  return (
    <div className="app-layout min-h-screen">
      {!mobile && <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={onSidebarToggle}
        isProUser={isProUser}
      />}

      <div
        style={{ marginLeft: mobile ? 0 : sidebarWidth, transition: mobile ? "none" : undefined }}
        className="app-content transition-[margin-left] duration-300 ease-in-out"
      >
        <TopBar
          mobile={mobile}
          isProUser={isProUser}
          quoteColor={quoteColor}
          currentCurrency={currentCurrency}
          availableDates={availableDates}
          dateRange={dateRange}
          onDatePickerValueChange={onDatePickerValueChange}
          lastRefreshAt={lastRefreshAt}
          compactTitle={mobile && (headerCollapsed || canGoBack) ? routeTitle(location.pathname, t) : undefined}
          overview={location.pathname === "/overview"}
          onBack={canGoBack ? () => navigate(backPath) : undefined}
          onRefreshSuccess={onRefreshSuccess}
          refreshAction={refreshAction}
        />

        {/* Main content */}
        <main id="app-main-content" tabIndex={-1} className="p-5"
          onPointerDown={(event) => {
            if (!mobile || event.pointerType !== "touch") return;
            swipeStart.current = event.clientX < 24 &&
              !(event.target as Element).closest('[aria-modal="true"]')
              ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
          }}
          onPointerUp={(event) => {
            const start = swipeStart.current;
            swipeStart.current = null;
            if (!mobile || !canGoBack || !start || event.pointerId !== start.id) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (dx > 90 && Math.abs(dx) > Math.abs(dy)) navigate(backPath);
          }}
          onPointerCancel={() => { swipeStart.current = null; }}>
          <PullToRefresh disabled={!mobile || /^\/assistant(\/|$)/.test(location.pathname)} onRefresh={() => refreshAction.current?.()}
            lastRefreshText={lastRefreshAt
              ? t("topbar.lastRefreshAt") + lastRefreshAt
              : t("topbar.neverRefreshBefore")}>
          {!/^\/(settings|goals|rebalance)(\/|$)/.test(location.pathname) && <div className="mobile-route-heading">
            <MobilePage title={routeTitle(location.pathname, t)} />
          </div>}
          <div className="relative min-h-[400px] min-w-0" aria-busy={initializing}>
            <React.Suspense
              fallback={<RouteLoadingFallback hidden={initializing} />}
            >
              <Outlet context={unread} />
            </React.Suspense>
            {initializing && (
              <PageLoadingOverlay
                title={t("loading.portfolio")}
                description={t("loading.portfolioDesc")}
              />
            )}
          </div>
          </PullToRefresh>
        </main>
      </div>
      <MobileNavigation unread={unread} onTabSwitch={() => {
        tabScroll.current[currentTab] = window.scrollY;
        tabSwitchCaptured.current = true;
      }} />
    </div>
  );
}

function MoreHub() {
  const { t } = useTranslation();
  const unread = useOutletContext<number>();
  const items = [
    { href: "#/rebalance", label: t("nav.rebalance") },
    { href: "#/goals", label: t("nav.goals"), value: unread > 0 ? String(unread) : undefined },
    { href: "#/assistant", label: t("nav.assistant") },
    { href: "#/settings", label: t("nav.settings") },
  ];
  return <div className="mobile-more-hub"><InsetGroup>
    {items.map((item) => <ListRow key={item.href} href={item.href} value={item.value}>{item.label}</ListRow>)}
  </InsetGroup></div>;
}

function AnalyticsHub() {
  const { t } = useTranslation();
  const items = [
    { href: "#/wallets", label: t("nav.wallets") },
    { href: "#/comparison", label: t("nav.comparison") },
    { href: "#/cost-basis", label: t("nav.costBasis") },
  ];
  return <div className="mobile-analytics-hub"><InsetGroup title={t("nav.analytics", "Analytics")}>
    {items.map((item) => <ListRow key={item.href} href={item.href}>{item.label}</ListRow>)}
  </InsetGroup></div>;
}

type AppRoutesProps = {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
  initializing: boolean;
  isProUser: boolean;
  setIsProUser: React.Dispatch<React.SetStateAction<boolean>>;
  quoteColor: QuoteColor;
  setQuoteColor: React.Dispatch<React.SetStateAction<QuoteColor>>;
  currentCurrency: CurrencyRateDetail;
  availableDates: Date[];
  dateRange: DateRange | undefined;
  tDateRange: { start: Date; end: Date };
  maxDateRange: { start: Date; end: Date };
  hasData: boolean;
  retainHistory: boolean;
  setRetainHistory: React.Dispatch<React.SetStateAction<boolean>>;
  onDatePickerValueChange: (
    selectedTimes: number,
    nextDateRange: DateRange | undefined,
  ) => void;
  lastRefreshAt?: string;
  onDataChanged: () => void;
  handleConfigurationSave: () => void;
};

function AppRoutes({
  sidebarCollapsed,
  onSidebarToggle,
  initializing,
  isProUser,
  setIsProUser,
  quoteColor,
  setQuoteColor,
  currentCurrency,
  availableDates,
  dateRange,
  tDateRange,
  maxDateRange,
  hasData,
  retainHistory,
  setRetainHistory,
  onDatePickerValueChange,
  lastRefreshAt,
  onDataChanged,
  handleConfigurationSave,
}: AppRoutesProps) {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/history") {
      setRetainHistory(false);
    }
  }, [location.pathname, setRetainHistory]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout
            sidebarCollapsed={sidebarCollapsed}
            onSidebarToggle={onSidebarToggle}
            initializing={initializing}
            isProUser={isProUser}
            quoteColor={quoteColor}
            currentCurrency={currentCurrency}
            availableDates={availableDates}
            dateRange={dateRange}
            onDatePickerValueChange={onDatePickerValueChange}
            lastRefreshAt={lastRefreshAt}
            onRefreshSuccess={() => {
              onDataChanged();
              syncRuntime.trigger("refresh");
            }}
          />
        }
      >
        <Route index element={<Navigate to="/overview" />} />
        <Route path="more" element={<MoreHub />} />
        <Route
          path="overview"
          element={
            <AnimatedPage>
              <PageWrapper dateRange={tDateRange} hasData={hasData}>
                <Overview
                  currency={currentCurrency}
                  dateRange={tDateRange}
                  quoteColor={quoteColor}
                />
              </PageWrapper>
            </AnimatedPage>
          }
        />
        <Route
          path="summary"
          element={
            <AnimatedPage>
              <PageWrapper dateRange={maxDateRange} hasData={hasData}>
                <AnalyticsHub />
                <Summary
                  currency={currentCurrency}
                  dateRange={maxDateRange}
                  quoteColor={quoteColor}
                />
              </PageWrapper>
            </AnimatedPage>
          }
        />
        <Route
          path="wallets"
          element={
            <AnimatedPage>
              <PageWrapper dateRange={tDateRange} hasData={hasData}>
                <WalletAnalysis
                  currency={currentCurrency}
                  dateRange={tDateRange}
                  quoteColor={quoteColor}
                />
              </PageWrapper>
            </AnimatedPage>
          }
        />
        <Route
          path="comparison"
          element={
            <AnimatedPage>
              <PageWrapper dateRange={tDateRange} hasData={hasData}>
                <Comparison
                  currency={currentCurrency}
                  quoteColor={quoteColor}
                />
              </PageWrapper>
            </AnimatedPage>
          }
        />
        <Route
          path="rebalance"
          element={
            <AnimatedPage>
              <Rebalance currency={currentCurrency} quoteColor={quoteColor} />
            </AnimatedPage>
          }
        />
        <Route path="goals" element={<AnimatedPage><GoalsAlerts /></AnimatedPage>} />
        <Route
          path="history"
          element={
            <AnimatedPage>
              <PageWrapper
                dateRange={tDateRange}
                hasData={hasData || retainHistory}
              >
                <HistoricalData
                  currency={currentCurrency}
                  dateRange={tDateRange}
                  quoteColor={quoteColor}
                  afterDataChanged={onDataChanged}
                />
              </PageWrapper>
            </AnimatedPage>
          }
        />
        <Route
          path="cost-basis"
          element={
            <AnimatedPage>
              <CostBasis quoteColor={quoteColor} />
            </AnimatedPage>
          }
        />
        <Route
          path="assistant"
          element={
            <AnimatedPage>
              <ChatPage isProUser={isProUser} />
            </AnimatedPage>
          }
        />
        <Route
          path="assistant/:sessionId"
          element={
            <AnimatedPage>
              <ChatPage isProUser={isProUser} />
            </AnimatedPage>
          }
        />
        <Route
          path="settings"
          element={
            <AnimatedPage>
              <Setting />
            </AnimatedPage>
          }
        >
          <Route
            path="configuration"
            element={
              <Configuration onConfigurationSave={handleConfigurationSave} />
            }
          />
          <Route
            path="appearance"
            element={
              <Appearance onQuoteColorChange={(v) => setQuoteColor(v)} />
            }
          />
          <Route
            path="data"
            element={<DataManagement onDataImported={onDataChanged} />}
          />
          <Route
            path="systemInfo"
            element={
              <SystemInfo
                onProStatusChange={(act: boolean) => {
                  setIsProUser(act);
                }}
              />
            }
          />
          <Route path="assistant" element={<AssistantSettings />} />
          <Route path="sync" element={<SyncSettingsPage />} />
        </Route>
        <Route
          path="coins/:symbol"
          element={
            <AnimatedPage>
              <CoinAnalysis
                currency={currentCurrency}
                dateRange={tDateRange}
                onDataChanged={onDataChanged}
              />
            </AnimatedPage>
          }
        />
        <Route path="*" element={<div>not found</div>} />
      </Route>
    </Routes>
  );
}

const App = () => {
  const { t } = useTranslation();
  const { setNeedResize } = React.useContext(ChartResizeContext);
  // todo: auto update this value, if user active or inactive
  const [isProUser, setIsProUser] = useState(false);
  const [quoteColor, setQuoteColor] = useState<QuoteColor>("green-up-red-down");

  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | undefined>(
    undefined,
  );
  const [currentCurrency, setCurrentCurrency] = useState<CurrencyRateDetail>(
    getDefaultCurrencyRate(),
  );

  const [originalQuerySize, setOriginalQuerySize] = useState<number>(0);
  const [hasData, setHasData] = useState(true);
  const [retainHistory, setRetainHistory] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [dataChangedVersion, setDataChangedVersion] = useState(0);
  const [autoBackupStatus, setAutoBackupStatus] = useState<
    "idle" | "running"
  >("idle");
  const lastSyncReport = useRef<object | undefined>(undefined);
  // Single mount guard reused by both boot and background effects.
  const activeRef = useRef(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 640,
  );
  const sidebarResizeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    const loadStartupData = () => Promise.all([
      queryPreferCurrency().then((c) => {
        if (active) setCurrentCurrency(c);
      }),
      getLicenseIfIsPro().then((l) => {
        if (active) setIsProUser(!!l);
      }),
      getQuoteColor().then((c) => {
        if (active) setQuoteColor(c);
      }),
    ]).then(() => loadAllData(active));

    const start = () => {
      if (!active) return;
      setInitializing(true);
      void loadStartupData()
        .then(() => {
          if (!active) return;
          void processAlerts().then((alerts) => deliverAlerts(alerts, (alert) => {
            const text = formatAlert(alert, t);
            toast({ title: text.title, description: text.message });
          }, t)).catch(() => {
            console.warn("startup alert evaluation failed");
          });
        })
        .catch(() => {
          if (!active) return;
          console.warn("startup data loading failed");
          toast({
            title: t("app.dataLoadFailed"),
            duration: 86_400_000,
            action: <ToastAction altText={t("app.retryDataLoad")} onClick={start} className="touch:min-h-11">
              {t("app.retryDataLoad")}
            </ToastAction>,
          });
        })
        .finally(() => {
          if (active) {
            setInitializing(false);
            void markIOSReady().catch(() => {
              console.warn("iOS readiness check failed");
            });
            // Defer to the next tick so the boot overlay clears first;
            // auto backup is intentionally off the critical path.
            window.setTimeout(() => {
              void runAutoBackupInBackground();
            }, 0);
          }
        });
    };
    start();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void syncRuntime.initialize();
    const onFocus = () => syncRuntime.trigger("focus");
    const onQuit = () => syncRuntime.stop();
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onQuit);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onQuit);
      syncRuntime.stop();
    };
  }, []);

  useEffect(() => syncRuntime.subscribe(() => {
    const { sync } = syncRuntime.status();
    const report = sync.report;
    if (!report?.pulledFrom?.length || lastSyncReport.current === report) return;
    lastSyncReport.current = report;
    const names = [...new Set(report.pulledFrom ?? [])].map((id) =>
      syncRuntime.getSettings().deviceNames[id] ?? id.slice(0, 8));
    toast({ description: t("sync.pulledToast")
      .replace("{count}", String(report.pulledFrom.length))
      .replace("{device}", names.join(", ")) });
  }), [t]);

  const tDateRange = useMemo(
    () => ({
      start: dateRange?.from ?? parseISO("1970-01-01"),
      end: dateRange?.to ?? parseISO("1970-01-01"),
    }),
    [dateRange],
  );
  useEffect(() => {
    if (dateRange?.from && dateRange.to && isValid(dateRange.from) && isValid(dateRange.to)) {
      localStorage.setItem(CURRENT_DATE_RANGE_KEY, JSON.stringify({
        from: format(dateRange.from, "yyyy-MM-dd"), to: format(dateRange.to, "yyyy-MM-dd"),
      }));
    }
  }, [dateRange]);

  const maxDateRange = useMemo(
    () => ({
      start: availableDates[0] ?? parseISO("1970-01-01"),
      end: availableDates[availableDates.length - 1] ?? parseISO("1970-01-01"),
    }),
    [availableDates],
  );

  function loadConfiguration() {
    queryPreferCurrency().then((c) => setCurrentCurrency(c));
    getLicenseIfIsPro().then((l) => setIsProUser(!!l));
    getQuoteColor().then((c) => setQuoteColor(c));
  }

  useEffect(() => {
    const applyAssistantAction = () => {
      loadConfiguration();
      try {
        const raw = localStorage.getItem(DATE_RANGE_KEY);
        if (!raw) return;
        const dates = validateActionArgs("set_date_range", JSON.parse(raw));
        localStorage.removeItem(DATE_RANGE_KEY);
        setDateRange({ from: parseISO(String(dates.from)), to: parseISO(String(dates.to)) });
      } catch {
        localStorage.removeItem(DATE_RANGE_KEY);
      }
    };
    window.addEventListener(ASSISTANT_APP_ACTION_EVENT, applyAssistantAction);
    return () => window.removeEventListener(ASSISTANT_APP_ACTION_EVENT, applyAssistantAction);
  }, []);

  // Track unmount so the background backup never setState's a torn-down
  // component. activeRef is shared between boot + background effects.
  useEffect(() => {
    return () => {
      activeRef.current = false;
    };
  }, []);

  // Run auto import + auto backup in the background after the initial
  // render. The page-loading overlay has already cleared by the time we
  // get here, so this work no longer blocks "Loading portfolio data".
  //
  // Data-refresh policy: snapshot a fingerprint before import, then
  // compare after. Only refresh page data when the persisted state
  // actually changed — the no-op case (autoBackup returning false,
  // autoImport short-circuiting on already-current backup) must not
  // force a re-render of the user-facing data.
  async function runAutoBackupInBackground() {
    if (!activeRef.current) return;
    setAutoBackupStatus("running");

    try {
      const preFingerprint = await getDataFingerprint();
      const imported = await autoImportHistoricalData();
      if (!activeRef.current) return;

      if (imported) {
        const postFingerprint = await getDataFingerprint();
        if (postFingerprint !== preFingerprint) {
          // Data changed: refresh the page promptly so the user
          // sees the imported data without reloading manually.
          clearAllCache();
          await loadAllData(activeRef.current);
        }
      }
    } catch (e) {
      console.error("auto import failed");
    }

    try {
      // Backup writes to disk only; the in-memory data is unchanged so
      // no page refresh is needed.
      await autoBackupHistoricalData();
    } catch (e) {
      console.error("auto backup failed");
    } finally {
      if (activeRef.current) {
        setAutoBackupStatus("idle");
      }
    }
  }

  async function handleQuerySizeWhenConfigurationChange() {
    const { dr, size } = await getInitialQueryDateRange();
    if (size !== originalQuerySize) {
      setDateRange((prev) => {
        const prevFrom = prev?.from?.getTime() ?? 0;
        const prevTo = prev?.to?.getTime() ?? 0;
        const nextFrom = dr?.from?.getTime() ?? 0;
        const nextTo = dr?.to?.getTime() ?? 0;
        if (prevFrom === nextFrom && prevTo === nextTo) {
          return prev;
        }
        return dr;
      });
      setOriginalQuerySize(size);
    }
  }

  function onDataChanged(action?: "delete" | "undoDeletion") {
    const currentHash = window.location.hash || "";
    const isSettingsRoute = currentHash.startsWith("#/settings");
    setRetainHistory(action === "delete" || action === "undoDeletion");
    // Bump the data-changed version first so any consumer that subscribes
    // through DataChangedContext sees a new value during this same tick,
    // even when the settings route skips loadAllData() below.
    setDataChangedVersion((v) => v + 1);
    clearAllCache();
    if (!isSettingsRoute) {
      void loadAllData(
        true,
        action === "delete" || action === "undoDeletion",
      ).catch(() => {
        console.warn("data reload failed");
      });
    }
    void autoBackupHistoricalData(true).catch(() => {
      console.warn("forced auto backup failed");
    });
  }

  const onDataChangedRef = useRef(onDataChanged);
  onDataChangedRef.current = onDataChanged;

  useEffect(() => {
    const handleSoftRefresh = () => {
      onDataChangedRef.current();
    };
    window.addEventListener(APP_SOFT_REFRESH_EVENT, handleSoftRefresh);
    return () => {
      window.removeEventListener(APP_SOFT_REFRESH_EVENT, handleSoftRefresh);
    };
  }, []);

  function clearAllCache() {
    console.debug("clear all cache");
    invalidateCacheGroups({
      localStorage: [CACHE_GROUP_KEYS.TOTAL_PROFIT_CACHE_GROUP_KEY],
      memory: [CACHE_GROUP_KEYS.REALTIME_ASSET_VALUES_CACHE_GROUP_KEY],
    });
  }

  function onDatePickerValueChange(
    _selectedTimes: number,
    nextDateRange: DateRange | undefined,
  ) {
    localStorage.removeItem(DATE_RANGE_KEY);
    setDateRange((prev) => {
      const prevFrom = prev?.from?.getTime() ?? 0;
      const prevTo = prev?.to?.getTime() ?? 0;
      const nextFrom = nextDateRange?.from?.getTime() ?? 0;
      const nextTo = nextDateRange?.to?.getTime() ?? 0;
      if (prevFrom === nextFrom && prevTo === nextTo) {
        return prev;
      }
      return nextDateRange;
    });
  }

  function loadAllData(active = true, preserveDateRange = false) {
    return Promise.all([
      queryLastRefreshAt(),
      getAvailableDates(),
      getInitialQueryDateRange(),
    ]).then(([lra, days, queryInfo]) => {
      if (!active) {
        return;
      }
      setLastRefreshAt((prev) => (prev === lra ? prev : lra));
      setHasData((prev) => {
        const nextHasData = !!lra;
        return prev === nextHasData ? prev : nextHasData;
      });
      setAvailableDates((prev) => (isSameDateList(prev, days) ? prev : days));

      const { dr, size } = queryInfo;
      if (!preserveDateRange) {
        let assistantDates: DateRange | undefined;
        try {
          const stored = localStorage.getItem(DATE_RANGE_KEY);
          if (stored) {
            const dates = validateActionArgs("set_date_range", JSON.parse(stored));
            assistantDates = { from: parseISO(String(dates.from)), to: parseISO(String(dates.to)) };
            localStorage.removeItem(DATE_RANGE_KEY);
          }
        } catch {
          localStorage.removeItem(DATE_RANGE_KEY);
        }
        setDateRange((prev) => {
          if (assistantDates) return assistantDates;
          const prevFrom = prev?.from?.getTime() ?? 0;
          const prevTo = prev?.to?.getTime() ?? 0;
          const nextFrom = dr?.from?.getTime() ?? 0;
          const nextTo = dr?.to?.getTime() ?? 0;
          if (prevFrom === nextFrom && prevTo === nextTo) {
            return prev;
          }
          return dr;
        });
      }
      setOriginalQuerySize((prev) => (prev === size ? prev : size));
    });
  }

  function isSameDateList(prev: Date[], next: Date[]) {
    if (prev.length !== next.length) {
      return false;
    }
    for (let i = 0; i < prev.length; i++) {
      if (prev[i]?.getTime() !== next[i]?.getTime()) {
        return false;
      }
    }
    return true;
  }

  const handleConfigurationSave = useCallback(() => {
    handleQuerySizeWhenConfigurationChange();
    loadConfiguration();
  }, [originalQuerySize]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);

    if (sidebarResizeTimerRef.current) {
      window.clearTimeout(sidebarResizeTimerRef.current);
    }
    // Trigger resize after sidebar width transition ends.
    sidebarResizeTimerRef.current = window.setTimeout(() => {
      setNeedResize((prev) => prev + 1);
    }, 320);
  }, [setNeedResize]);

  useEffect(() => {
    return () => {
      if (sidebarResizeTimerRef.current) {
        window.clearTimeout(sidebarResizeTimerRef.current);
      }
    };
  }, []);

  return (
    <div>
      <AutoBackupIndicator status={autoBackupStatus} />
      <SyncStatusIndicator />
      <DataChangedContext.Provider value={dataChangedVersion}>
        <HashRouter>
          <AppRoutes
          sidebarCollapsed={sidebarCollapsed}
          onSidebarToggle={handleSidebarToggle}
          initializing={initializing}
          isProUser={isProUser}
          setIsProUser={setIsProUser}
          quoteColor={quoteColor}
          setQuoteColor={setQuoteColor}
          currentCurrency={currentCurrency}
          availableDates={availableDates}
          dateRange={dateRange}
          tDateRange={tDateRange}
          maxDateRange={maxDateRange}
          hasData={hasData}
          retainHistory={retainHistory}
          setRetainHistory={setRetainHistory}
          onDatePickerValueChange={onDatePickerValueChange}
          lastRefreshAt={lastRefreshAt}
          onDataChanged={onDataChanged}
          handleConfigurationSave={handleConfigurationSave}
        />
        </HashRouter>
      </DataChangedContext.Provider>
    </div>
  );
};

export default App;
