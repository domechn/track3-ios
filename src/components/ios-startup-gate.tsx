import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "@/i18n";
import { isIOS } from "@/utils/platform";

export default function IOSStartupGate({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [state, setState] = useState<"checking" | "ready" | "locked">(isIOS() ? "checking" : "ready");
  const retry = useCallback(() => {
    void (async () => {
      try {
        const failure = await invoke<string | null>("ios_startup_failure");
        if (!failure || await invoke<boolean>("ios_retry_startup")) setState("ready");
      } catch {
        // Keep the portfolio locked while startup status is unknown.
      }
    })();
  }, []);

  useEffect(() => {
    if (!isIOS()) return;
    let active = true;
    void invoke<string | null>("ios_startup_failure")
      .then((failure) => { if (active) setState(failure ? "locked" : "ready"); })
      .catch(() => { if (active) setState("locked"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (state !== "locked") return;
    const onFocus = () => { if (document.visibilityState !== "hidden") retry(); };
    const onVisibility = () => { if (document.visibilityState === "visible") retry(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, retry]);

  if (state === "checking") return <div className="min-h-dvh bg-background" />;
  if (state === "locked") return <main role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <h1 className="text-2xl font-semibold">{t("ios.startupLocked.title")}</h1>
    <p className="max-w-sm text-sm text-muted-foreground">{t("ios.startupLocked.message")}</p>
    <button className="min-h-11 rounded-lg bg-primary px-5 text-primary-foreground" onClick={retry}>{t("ios.startupLocked.retry")}</button>
  </main>;
  return <>{children}</>;
}
