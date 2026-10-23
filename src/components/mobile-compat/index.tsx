import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon } from "@radix-ui/react-icons";

// Replace these small adapters with the S2 mobile primitives after integration.
export function InsetGroup({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border bg-card">{children}</div>;
}

export function ListRow({ to, title }: { to: string; title: string }) {
  return <Link to={to} className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3 text-base last:border-0 active:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
    <span>{title}</span>
    <ChevronRightIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground" />
  </Link>;
}

export function MobilePage({ title, children }: { title: string; children: ReactNode }) {
  return <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 overflow-y-auto bg-background px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)]">
    {children}
  </div>;
}

export function BottomSheet({ title, children }: { title: string; children: ReactNode }) {
  return <div role="alertdialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-end bg-black/50 p-3">
    <div className="w-full space-y-2 rounded-2xl bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {children}
    </div>
  </div>;
}
