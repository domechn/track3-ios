import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import { BottomSheet, MobilePage } from "@/components/mobile-compat";
import type { OtherRow } from "./types";

export function MobileOthers(props: {
  others: OtherRow[];
  onSave: (index: number | null, value: OtherRow) => void;
  onRemove: (index: number) => void;
  onAttach: (index: number) => void;
}) {
  const { t } = useTranslation();
  const [editor, setEditor] = useState<{ index: number | null; value: OtherRow; amount: string }>();
  const [removal, setRemoval] = useState<number | null>(null);
  const [error, setError] = useState("");
  const open = (index: number | null) => {
    const value = index === null ? { symbol: "", amount: 0, alias: "" } : props.others[index];
    setEditor({ index, value: { ...value, alias: value.alias ?? "" }, amount: String(value.amount) });
    setError("");
  };
  const save = () => {
    if (!editor) return;
    const amount = Number(editor.amount);
    if (!editor.value.symbol.trim() || !editor.amount.trim() || !Number.isFinite(amount)) {
      setError(t("mobile.others.invalid"));
      return;
    }
    props.onSave(editor.index, { ...editor.value, symbol: editor.value.symbol.trim().toUpperCase(), amount });
    setEditor(undefined);
  };
  return <section className="space-y-2">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold">{t("config.others")}</h2>
      <Button variant="outline" className="min-h-11" onClick={() => open(null)}>{t("config.addSymbol")}</Button>
    </div>
    <div className="overflow-hidden rounded-2xl border bg-card">
      {props.others.length === 0 && <p className="px-4 py-5 text-sm text-muted-foreground">{t("mobile.others.empty")}</p>}
      {props.others.map((other, index) => <div key={`${other.symbol}-${index}`} className="flex min-w-0 items-center gap-2 border-b px-4 py-2 last:border-0">
        <button className="min-h-11 min-w-0 flex-1 text-left" aria-label={`${t("goals.edit")} ${other.symbol}`} onClick={() => open(index)}>
          <span className="block truncate font-medium">{other.alias || other.symbol}</span>
          <span className="block truncate text-xs text-muted-foreground">{other.amount.toLocaleString()} {other.symbol}</span>
        </button>
        <button className="min-h-11 rounded-lg px-2 text-sm text-primary" aria-label={`${t("config.others.attachTo")} ${other.symbol}`} onClick={() => props.onAttach(index)}>{t("config.others.attachTo")}</button>
        <button className="min-h-11 min-w-11 text-destructive" aria-label={`${t("common.delete")} ${other.symbol}`} onClick={() => setRemoval(index)}>×</button>
      </div>)}
    </div>
    {editor && <MobilePage title={t("mobile.others.edit")} onDismiss={() => setEditor(undefined)}>
      <div className="mx-auto max-w-xl space-y-5">
        <Button variant="ghost" className="min-h-11" onClick={() => setEditor(undefined)}>{t("common.cancel")}</Button>
        <h2 className="text-3xl font-bold">{t("mobile.others.edit")}</h2>
        <div className="space-y-2"><Label htmlFor="other-alias">{t("config.formAlias")}</Label><Input id="other-alias" className="min-h-12 text-base" autoComplete="off" value={editor.value.alias ?? ""} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, alias: event.target.value } })} /></div>
        <div className="space-y-2"><Label htmlFor="other-symbol">{t("config.formSymbol")}</Label><Input id="other-symbol" className="min-h-12 text-base" autoComplete="off" autoCapitalize="characters" value={editor.value.symbol} onChange={(event) => setEditor({ ...editor, value: { ...editor.value, symbol: event.target.value } })} /></div>
        <div className="space-y-2"><Label htmlFor="other-amount">{t("config.formAmount")}</Label><Input id="other-amount" className="min-h-12 text-base" inputMode="decimal" value={editor.amount} onChange={(event) => setEditor({ ...editor, amount: event.target.value })} /></div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button className="min-h-12 w-full" onClick={save}>{t("config.saveChanges")}</Button>
      </div>
    </MobilePage>}
    {removal !== null && <BottomSheet title={t("config.removeDialogTitle")} onDismiss={() => setRemoval(null)}>
        <p className="py-2 text-center">{t("config.removeDialogDesc")}</p>
        <Button variant="destructive" className="min-h-12 w-full" onClick={() => { props.onRemove(removal); setRemoval(null); }}>{t("common.delete")}</Button>
        <Button variant="outline" className="min-h-12 w-full" onClick={() => setRemoval(null)}>{t("common.cancel")}</Button>
    </BottomSheet>}
  </section>;
}
