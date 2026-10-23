import { useEffect, useState } from "react";
import { queryLatestAssets, queryRealTimeAssetsValue } from "@/middlelayers/charts";
import { useDataChangedVersion } from "@/contexts/data-changed";
import { currencyWrapper, prettyNumberToLocaleString } from "@/utils/currency";
import type { CurrencyRateDetail } from "@/middlelayers/types";
import { useTranslation } from "@/i18n";

export function MobileHeaderTotal({ currency, live }: { currency: CurrencyRateDetail; live: boolean }) {
  const { t } = useTranslation();
  const version = useDataChangedVersion();
  const [total, setTotal] = useState<number>();
  useEffect(() => {
    if (!window.matchMedia?.("(max-width: 640px) and (pointer: coarse)").matches) return;
    let active = true;
    const query = live ? queryRealTimeAssetsValue : queryLatestAssets;
    void query().catch(() => queryLatestAssets()).then((assets) => {
      if (active) setTotal(assets.reduce((sum, asset) => sum + asset.value, 0));
    }).catch(() => { if (active) setTotal(undefined); });
    return () => { active = false; };
  }, [version, live]);
  return <div className="mobile-header-total" aria-label={t("history.total")}>
    <span className="mobile-header-total-label">{t("history.total")}</span>
    <span className="mobile-header-total-value">{total === undefined ? "—" :
      `${currency.symbol}${prettyNumberToLocaleString(currencyWrapper(currency)(total))}`}</span>
  </div>;
}
