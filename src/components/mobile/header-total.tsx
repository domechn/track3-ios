import { useEffect, useState } from "react";
import { queryLatestAssets, queryRealTimeAssetsValue } from "@/middlelayers/charts";
import { useDataChangedVersion } from "@/contexts/data-changed";
import { currencyWrapper, prettyNumberToLocaleString } from "@/utils/currency";
import type { CurrencyRateDetail } from "@/middlelayers/types";
import { useTranslation } from "@/i18n";
import { MOBILE_MEDIA_QUERY } from "./index";

export function MobileHeaderTotal({ currency, live }: { currency: CurrencyRateDetail; live: boolean }) {
  const { t } = useTranslation();
  const version = useDataChangedVersion();
  const [total, setTotal] = useState<number>();
  useEffect(() => {
    if (!window.matchMedia?.(MOBILE_MEDIA_QUERY).matches) return;
    let active = true;
    const query = live ? queryRealTimeAssetsValue : queryLatestAssets;
    const load = () => {
      void query().catch(() => queryLatestAssets()).then((assets) => {
        if (active) setTotal(assets.reduce((sum, asset) => sum + asset.value, 0));
      }).catch(() => { if (active) setTotal(undefined); });
    };
    load();
    const timer = live ? window.setInterval(load, 60_000) : undefined;
    return () => { active = false; if (timer !== undefined) window.clearInterval(timer); };
  }, [version, live]);
  return <div className="mobile-header-total" aria-label={t("history.total")}>
    <span className="mobile-header-total-label">{t("history.total")}</span>
    <span className="mobile-header-total-value">{total === undefined ? "—" :
      `${currency.symbol}${prettyNumberToLocaleString(currencyWrapper(currency)(total))}`}</span>
  </div>;
}
