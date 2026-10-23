import { cn } from "@/lib/utils";
import {
  Outlet,
  Navigate,
  useLocation,
  Link,
  useMatch,
  useResolvedPath,
} from "react-router-dom";
import {
  GearIcon,
  SunIcon,
  ArchiveIcon,
  InfoCircledIcon,
  RocketIcon,
  UpdateIcon,
  ChevronLeftIcon,
} from "@radix-ui/react-icons";
import { useTranslation } from "@/i18n";
import { isIOS } from "@/utils/platform";
import { InsetGroup, ListRow } from "@/components/mobile";
import AssistantSettings from "./assistant";

const settingsTabs = [
  {
    titleKey: "settings.tab.configuration",
    href: "/settings/configuration",
    icon: GearIcon,
  },
  {
    titleKey: "settings.tab.appearance",
    href: "/settings/appearance",
    icon: SunIcon,
  },
  {
    titleKey: "settings.tab.data",
    href: "/settings/data",
    icon: ArchiveIcon,
  },
  {
    titleKey: "settings.tab.system",
    href: "/settings/systemInfo",
    icon: InfoCircledIcon,
  },
  {
    titleKey: "settings.tab.assistant",
    href: "/settings/assistant",
    icon: RocketIcon,
  },
  {
    titleKey: "settings.tab.sync",
    href: "/settings/sync",
    icon: UpdateIcon,
  },
];

const mobileSettings = [
  { key: "settings.mobile.sources", href: "/settings/configuration?section=sources" },
  { key: "settings.mobile.currency", href: "/settings/configuration?section=currency" },
  { key: "settings.tab.appearance", href: "/settings/appearance?section=theme" },
  { key: "settings.mobile.language", href: "/settings/appearance?section=language" },
  { key: "settings.mobile.blacklist", href: "/settings/data?section=blacklist" },
  { key: "settings.mobile.pro", href: "/settings/systemInfo?section=pro" },
  { key: "settings.mobile.ai", href: "/settings/assistant" },
  { key: "settings.mobile.security", href: "/settings/data?section=security" },
  { key: "settings.mobile.backup", href: "/settings/data?section=backup" },
  { key: "settings.mobile.sync", href: "/settings/sync" },
  { key: "settings.mobile.about", href: "/settings/systemInfo?section=about" },
] as const;

function TabLink({
  to,
  title,
  icon: Icon,
}: {
  to: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const resolved = useResolvedPath(to);
  const match = useMatch({ path: resolved.pathname, end: true });

  return (
    <Link
      to={to}
      aria-current={match ? "page" : undefined}
      className={cn(
        "flex touch:min-h-11 items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        match
          ? "bg-accent/80 text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {title}
    </Link>
  );
}

const App = () => {
  const { t } = useTranslation();
  const lo = useLocation();
  if (isIOS()) {
    const isHub = lo.pathname === "/settings";
    const title = mobileSettings.find((item) =>
      `${item.href}` === `${lo.pathname}${lo.search}`)?.key ??
      mobileSettings.find((item) => item.href.split("?")[0] === lo.pathname)?.key;
    return (
      <div className="mx-auto w-full max-w-2xl min-w-0 space-y-5 pb-6">
        {isHub ? (
          <>
            <h1 className="px-1 pt-2 text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
            <nav aria-label={t("settings.sectionsAriaLabel")}>
              <InsetGroup>
                {mobileSettings.map((item) => (
                  <ListRow
                    key={item.href}
                    href={`#${item.href}`}
                  >{t(item.key)}</ListRow>
                ))}
              </InsetGroup>
            </nav>
          </>
        ) : (
          <>
            <header className="space-y-3 px-1 pt-1">
              <Link to="/settings" className="inline-flex min-h-11 items-center gap-1 text-primary">
                <ChevronLeftIcon aria-hidden="true" className="h-5 w-5" />
                {t("settings.title")}
              </Link>
              <h1 className="text-3xl font-bold tracking-tight">{t(title ?? "settings.title")}</h1>
            </header>
            <Outlet />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="sr-only">{t("settings.title")}</h1>
      <nav
        aria-label={t("settings.sectionsAriaLabel")}
        className="flex flex-wrap items-center gap-1 glass rounded-xl px-2 py-1.5"
      >
        {settingsTabs.map((tab) => (
          <TabLink
            key={tab.href}
            to={tab.href}
            title={t(tab.titleKey)}
            icon={tab.icon}
          />
        ))}
      </nav>
      <div className="w-full">
        <Outlet />
        {lo.pathname === "/settings" && (
          <Navigate to="/settings/configuration" />
        )}
      </div>
    </div>
  );
};

export default App;
