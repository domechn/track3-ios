import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import { maskSensitive, truncateAddress } from "@/utils/attach-to";
import { iosHaptic } from "@/utils/ios-native";
import { BottomSheet, MobilePage } from "@/components/mobile-compat";
import type { ExchangeRow, StockBrokerRow, WalletRow, SelectOption } from "./types";

export type MobileSourcesProps = {
  exchanges: ExchangeRow[];
  wallets: WalletRow[];
  brokers: StockBrokerRow[];
  exchangeOptions: SelectOption[];
  walletOptions: SelectOption[];
  brokerOptions: SelectOption[];
  onSaveExchange: (value: ExchangeRow, original?: ExchangeRow) => Promise<void>;
  onSaveWallet: (value: WalletRow, original?: WalletRow) => Promise<void>;
  onSaveBroker: (value: StockBrokerRow, original?: StockBrokerRow) => Promise<void>;
  onRemoveExchange: (value: ExchangeRow) => void;
  onRemoveWallet: (value: WalletRow) => void;
  onRemoveBroker: (value: StockBrokerRow) => void;
  onToggleExchange: (value: ExchangeRow) => void;
  onToggleWallet: (value: WalletRow) => void;
  onToggleBroker: (value: StockBrokerRow) => void;
  isPro?: boolean;
  onQuickLookExchange?: (value: ExchangeRow) => void;
  onQuickLookWallet?: (value: WalletRow) => void;
  onQuickLookBroker?: (value: StockBrokerRow) => void;
};

type Kind = "exchange" | "wallet" | "broker";
type Draft = ExchangeRow | WalletRow | StockBrokerRow;
type Editor = { kind: Kind; step: 1 | 2; draft: Draft; original?: Draft };
type PendingRemoval = { kind: Kind; value: Draft };

const blank = {
  exchange: (): ExchangeRow => ({ type: "binance", apiKey: "", secret: "", active: true }),
  wallet: (): WalletRow => ({ type: "btc", address: "", active: true }),
  broker: (): StockBrokerRow => ({ type: "ibkr", token: "", queryId: "", active: true }),
};

export function MobileSources(props: MobileSourcesProps) {
  const { t } = useTranslation();
  const [editor, setEditor] = useState<Editor>();
  const [removal, setRemoval] = useState<PendingRemoval>();
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<string>();
  const [saving, setSaving] = useState(false);
  const start = (kind: Kind, original?: Draft) => {
    setError("");
    setErrorField(undefined);
    setEditor({ kind, step: original ? 2 : 1, original, draft: original ? { ...original } : blank[kind]() });
  };
  const update = (patch: Record<string, string>) => {
    if (errorField && errorField in patch) { setError(""); setErrorField(undefined); }
    setEditor((current) => current ? { ...current, draft: { ...current.draft, ...patch } } : current);
  };
  const close = () => { setEditor(undefined); setError(""); setErrorField(undefined); };
  const save = async () => {
    if (!editor) return;
    const { kind, draft, original } = editor;
    if (kind === "exchange") {
      const value = draft as ExchangeRow;
      const missing = !value.apiKey.trim() ? "apiKey"
        : !value.secret.trim() ? "secret"
        : value.type === "okex" && !value.password?.trim() ? "password"
        : value.type === "bitget" && !value.passphrase?.trim() ? "passphrase" : "";
      if (missing) {
        const labels: Record<string, string> = { apiKey: t("config.formApiKey"), secret: t("config.formApiSecret"), password: t("config.formPassword"), passphrase: t("config.formPassphrase") };
        setError(t("mobile.sources.required").replace("{field}", labels[missing]));
        setErrorField(missing);
        return;
      }
    } else if (kind === "wallet" && !(draft as WalletRow).address.trim()) {
      setError(t("mobile.sources.required").replace("{field}", t("config.formAddress")));
      setErrorField("address");
      return;
    } else if (kind === "broker") {
      const value = draft as StockBrokerRow;
      const missing = !value.token.trim() ? "token" : !value.queryId.trim() ? "queryId" : "";
      if (missing) {
        setError(t("mobile.sources.required").replace("{field}", t(missing === "token" ? "config.formToken" : "config.queryId")));
        setErrorField(missing);
        return;
      }
    }
    setSaving(true);
    setError("");
    setErrorField(undefined);
    try {
      if (kind === "exchange") await props.onSaveExchange(draft as ExchangeRow, original as ExchangeRow | undefined);
      if (kind === "wallet") await props.onSaveWallet(draft as WalletRow, original as WalletRow | undefined);
      if (kind === "broker") await props.onSaveBroker(draft as StockBrokerRow, original as StockBrokerRow | undefined);
      void iosHaptic("success").catch(() => {});
      close();
    } catch {
      setError(t("mobile.sources.validationFailed"));
      setErrorField(undefined);
    } finally {
      setSaving(false);
    }
  };
  const paste = async (field: string) => {
    try { update({ [field]: await navigator.clipboard.readText() }); }
    catch { setError(t("mobile.sources.pasteFailed")); }
  };
  const remove = () => {
    if (!removal) return;
    if (removal.kind === "exchange") props.onRemoveExchange(removal.value as ExchangeRow);
    if (removal.kind === "wallet") props.onRemoveWallet(removal.value as WalletRow);
    if (removal.kind === "broker") props.onRemoveBroker(removal.value as StockBrokerRow);
    void iosHaptic("light").catch(() => {});
    setRemoval(undefined);
  };
  const sections: { kind: Kind; label: string; add: string; rows: Draft[]; options: SelectOption[] }[] = [
    { kind: "exchange", label: t("config.exchanges"), add: t("mobile.sources.addExchange"), rows: props.exchanges, options: props.exchangeOptions },
    { kind: "wallet", label: t("config.wallet"), add: t("mobile.sources.addWallet"), rows: props.wallets, options: props.walletOptions },
    { kind: "broker", label: t("config.stockBrokers"), add: t("mobile.sources.addBroker"), rows: props.brokers, options: props.brokerOptions },
  ];
  return (
    <div className="space-y-6">
      {sections.map(({ kind, label, add, rows, options }) => (
        <section key={kind} aria-label={label} className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{label}</h2>
            <Button className="min-h-11" variant="outline" onClick={() => start(kind)}>{add}</Button>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-card">
            {rows.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">{t("mobile.sources.empty")}</p> : rows.map((row, index) => {
              const identity = kind === "exchange" ? maskSensitive((row as ExchangeRow).apiKey)
                : kind === "wallet" ? truncateAddress((row as WalletRow).address)
                : maskSensitive((row as StockBrokerRow).queryId);
              const name = row.alias || options.find((option) => option.value === row.type)?.label || row.type;
              return <div key={`${row.type}-${index}`} className="flex min-w-0 items-center gap-2 border-b px-4 py-2 last:border-0">
                <button className="min-h-11 min-w-0 flex-1 text-left" onClick={() => start(kind, row)}>
                  <span className="block truncate font-medium">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{identity}</span>
                </button>
                {props.isPro && <button className="min-h-11 rounded-lg px-2 text-sm text-primary" aria-label={`${t("config.quickLook")} ${name}`} onClick={() => {
                  if (kind === "exchange") props.onQuickLookExchange?.(row as ExchangeRow);
                  if (kind === "wallet") props.onQuickLookWallet?.(row as WalletRow);
                  if (kind === "broker") props.onQuickLookBroker?.(row as StockBrokerRow);
                }}>{t("config.quickLook")}</button>}
                <button className="min-h-11 rounded-lg px-2 text-sm text-primary" aria-label={`${t("mobile.sources.toggle")} ${name}`} onClick={() => {
                  if (kind === "exchange") props.onToggleExchange(row as ExchangeRow);
                  if (kind === "wallet") props.onToggleWallet(row as WalletRow);
                  if (kind === "broker") props.onToggleBroker(row as StockBrokerRow);
                }}>{row.active ? t("config.active") : t("config.inactive")}</button>
                <button className="min-h-11 min-w-11 text-destructive" aria-label={`${t("common.delete")} ${name}`} onClick={() => setRemoval({ kind, value: row })}>×</button>
              </div>;
            })}
          </div>
        </section>
      ))}
      {editor && <MobilePage title={t("mobile.sources.edit")}>
        <div className="mx-auto max-w-xl space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" className="min-h-11" onClick={close}>{t("common.cancel")}</Button>
            <span className="text-sm text-muted-foreground">{editor.step} / 2</span>
          </div>
          <h2 className="text-3xl font-bold">{editor.original ? t("mobile.sources.edit") : sections.find((section) => section.kind === editor.kind)?.add}</h2>
          {editor.step === 1 ? <>
            <Label htmlFor="mobile-provider">{t("config.formType")}</Label>
            <select id="mobile-provider" className="mt-2 min-h-12 w-full rounded-xl border bg-card px-3" value={editor.draft.type} onChange={(event) => update({ type: event.target.value })}>
              {sections.find((section) => section.kind === editor.kind)?.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button className="min-h-12 w-full" onClick={() => setEditor({ ...editor, step: 2 })}>{t("mobile.sources.continue")}</Button>
          </> : <>
            <Field id="mobile-alias" label={t("config.formAlias")} value={editor.draft.alias ?? ""} onChange={(value) => update({ alias: value })} />
            {editor.kind === "exchange" && <>
              <Field id="mobile-api-key" label={t("config.formApiKey")} value={(editor.draft as ExchangeRow).apiKey} onChange={(value) => update({ apiKey: value })} onPaste={() => void paste("apiKey")} invalid={errorField === "apiKey"} />
              <Field id="mobile-secret" label={t("config.formApiSecret")} value={(editor.draft as ExchangeRow).secret} onChange={(value) => update({ secret: value })} secret onPaste={() => void paste("secret")} invalid={errorField === "secret"} />
              {editor.draft.type === "okex" && <Field id="mobile-password" label={t("config.formPassword")} value={(editor.draft as ExchangeRow).password ?? ""} onChange={(value) => update({ password: value })} secret onPaste={() => void paste("password")} invalid={errorField === "password"} />}
              {editor.draft.type === "bitget" && <Field id="mobile-passphrase" label={t("config.formPassphrase")} value={(editor.draft as ExchangeRow).passphrase ?? ""} onChange={(value) => update({ passphrase: value })} secret onPaste={() => void paste("passphrase")} invalid={errorField === "passphrase"} />}
            </>}
            {editor.kind === "wallet" && <Field id="mobile-address" label={t("config.formAddress")} value={(editor.draft as WalletRow).address} onChange={(value) => update({ address: value })} onPaste={() => void paste("address")} invalid={errorField === "address"} />}
            {editor.kind === "broker" && <>
              <Field id="mobile-token" label={t("config.formToken")} value={(editor.draft as StockBrokerRow).token} onChange={(value) => update({ token: value })} secret onPaste={() => void paste("token")} invalid={errorField === "token"} />
              <Field id="mobile-query-id" label={t("config.queryId")} value={(editor.draft as StockBrokerRow).queryId} onChange={(value) => update({ queryId: value })} onPaste={() => void paste("queryId")} invalid={errorField === "queryId"} />
            </>}
            {error && <p id="mobile-source-error" role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="min-h-12 w-full" disabled={saving} onClick={() => void save()}>{t("config.saveChanges")}</Button>
          </>}
        </div>
      </MobilePage>}
      {removal && <BottomSheet title={t("config.removeDialogTitle")}>
          <p className="py-2 text-center">{t("config.removeDialogDesc")}</p>
          <Button variant="destructive" className="min-h-12 w-full" onClick={remove}>{t("common.delete")}</Button>
          <Button variant="outline" className="min-h-12 w-full" onClick={() => setRemoval(undefined)}>{t("common.cancel")}</Button>
      </BottomSheet>}
    </div>
  );
}

function Field({ id, label, value, onChange, secret = false, onPaste, invalid = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; secret?: boolean; onPaste?: () => void; invalid?: boolean;
}) {
  const { t } = useTranslation();
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex gap-2">
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} type={secret ? "password" : "text"} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={invalid ? "mobile-source-error" : undefined} className="min-h-12 min-w-0 flex-1 text-base" />
      {onPaste && <Button variant="outline" className="min-h-12" onClick={onPaste}>{t("mobile.sources.paste")}</Button>}
    </div>
  </div>;
}
