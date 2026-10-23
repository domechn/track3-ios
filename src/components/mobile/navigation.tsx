import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChartIcon, ClockIcon, DashboardIcon, DotsHorizontalIcon } from "@radix-ui/react-icons";
import { useTranslation } from "@/i18n";
import { useHaptics } from "./index";

export type MobileTab = "overview" | "history" | "analytics" | "more";
export const tabRoots: Record<MobileTab, string> = {
  overview: "/overview", history: "/history", analytics: "/summary", more: "/more",
};

export function tabForPath(path: string): MobileTab {
  if (path.startsWith("/history")) return "history";
  if (path.startsWith("/overview")) return "overview";
  if (/^\/(summary|wallets|comparison|cost-basis|coins)(\/|$)/.test(path)) return "analytics";
  return "more";
}

export function MobileNavigation({ unread = 0, onTabSwitch }: { unread?: number; onTabSwitch?: () => void }) {
  const { t } = useTranslation();
  const haptic = useHaptics();
  const { pathname, search } = useLocation();
  const selected = tabForPath(pathname);
  const lastPath = useRef<Record<MobileTab, string>>({ ...tabRoots });
  useEffect(() => {
    lastPath.current[selected] = pathname + search;
  }, [pathname, search, selected]);
  const tabs = [
    { id: "overview" as const, icon: DashboardIcon, title: t("nav.overview") },
    { id: "history" as const, icon: ClockIcon, title: t("nav.history") },
    { id: "analytics" as const, icon: BarChartIcon, title: t("nav.analytics", "Analytics") },
    { id: "more" as const, icon: DotsHorizontalIcon, title: t("nav.more", "More") },
  ];
  return <nav aria-label={t("mobile.tabs", "Tabs")} className="mobile-tab-bar">
    {tabs.map(({ id, icon: Icon, title }) => <Link key={id} to={selected === id ? tabRoots[id] : lastPath.current[id]}
      onClick={(event) => {
        haptic("selection");
        if (selected === id && pathname === tabRoots[id]) {
          event.preventDefault();
          window.scrollTo(0, 0);
        } else if (selected !== id) {
          onTabSwitch?.();
        }
      }}
      className="mobile-tab" aria-current={selected === id ? "page" : undefined}>
      <span className="mobile-tab-icon"><Icon aria-hidden="true" />{id === "more" && unread > 0 &&
        <span className="mobile-tab-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}</span>
      <span>{title}</span>
      {id === "more" && unread > 0 && <span className="sr-only">{t("goals.unread").replace("{count}", String(unread))}</span>}
    </Link>)}
  </nav>;
}

export function routeTitle(path: string, t: (key: string, fallback?: string) => string) {
  const base = path.split("/")[1];
  const titles: Record<string, string> = {
    overview: "nav.overview", history: "nav.history", summary: "nav.summary",
    wallets: "nav.wallets", comparison: "nav.comparison", "cost-basis": "nav.costBasis",
    coins: "nav.analytics", rebalance: "nav.rebalance", goals: "nav.goals",
    assistant: "nav.assistant", settings: "nav.settings", more: "nav.more",
  };
  return t(titles[base] ?? "nav.more", "More");
}
