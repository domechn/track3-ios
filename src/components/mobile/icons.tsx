import type { SVGProps } from "react";

export type MobileIconName = "overview" | "history" | "analytics" | "more" | "refresh" | "chevron";

export function MobileIcon({ name, filled = false, ...props }: SVGProps<SVGSVGElement> & {
  name: MobileIconName; filled?: boolean;
}) {
  const paths = {
    overview: <><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></>,
    history: <><circle cx="12" cy="12" r="9" fill={filled ? "currentColor" : "none"} />
      <path d="M12 7v5l3.5 2" stroke={filled ? "hsl(var(--card))" : "currentColor"} fill="none" /></>,
    analytics: <><path d="M4 20V12m5 8V5m5 15v-9m5 9V8" strokeLinecap="round" /></>,
    more: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
    refresh: <><path d="M20 8a8 8 0 1 0 1 6M20 3v5h-5" strokeLinecap="round" strokeLinejoin="round" /></>,
    chevron: <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />,
  };
  return <svg viewBox="0 0 24 24" width="24" height="24"
    fill={filled && (name === "overview" || name === "more") ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth={filled ? 2.3 : 1.9} aria-hidden="true" {...props}>{paths[name]}</svg>;
}
