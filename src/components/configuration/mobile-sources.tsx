import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import { maskSensitive, truncateAddress } from "@/utils/attach-to";
import { redactSecrets } from "@/middlelayers/security/redact";
import { ChevronRightIcon, DotsHorizontalIcon, EyeOpenIcon } from "@radix-ui/react-icons";
import { ActionSheet, useHaptics } from "@/components/mobile";
import { ConfirmSheet, ModalPage } from "@/components/mobile/overlays";
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
  formatError?: (error: unknown) => string;
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
  const haptic = useHaptics();
  const [editor, setEditor] = useState<Editor>();
  const [removal, setRemoval] = useState<PendingRemoval>();
  const [menu, setMenu] = useState<(PendingRemoval & { name: string })>();
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<string>();
  const [saving, setSaving] = useState(false);
  const start = (kind: Kind, original?: Draft) => {
    haptic("selection");
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
      haptic("success");
      close();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      if (message.startsWith("Duplicate ")) {
        setError(t("mobile.sources.duplicate"));
      } else if (message.startsWith("Invalid ")) {
        const invalidKey = kind === "exchange" ? "config.invalidApiKey"
          : kind === "broker" ? "config.invalidStockConfig"
          : "mobile.sources.validationFailed";
        setError(t(navigator.onLine ? invalidKey : "mobile.sources.verifyFailed"));
      } else {
        const secrets = kind === "exchange" ? [(draft as ExchangeRow).apiKey, (draft as ExchangeRow).secret, (draft as ExchangeRow).password ?? "", (draft as ExchangeRow).passphrase ?? ""]
          : kind === "wallet" ? [(draft as WalletRow).address]
          : [(draft as StockBrokerRow).token, (draft as StockBrokerRow).queryId];
        setError(`${t("mobile.sources.verifyFailed")} ${redactSecrets(props.formatError?.(failure) ?? message, secrets)}`);
      }
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
    haptic("light");
    setRemoval(undefined);
  };
  const sections: { kind: Kind; label: string; add: string; rows: Draft[]; options: SelectOption[] }[] = [
    { kind: "exchange", label: t("config.exchanges"), add: t("mobile.sources.addExchange"), rows: props.exchanges, options: props.exchangeOptions },
    { kind: "wallet", label: t("config.wallet"), add: t("mobile.sources.addWallet"), rows: props.wallets, options: props.walletOptions },
    { kind: "broker", label: t("config.stockBrokers"), add: t("mobile.sources.addBroker"), rows: props.brokers, options: props.brokerOptions },
  ];
  return (
    <div className="ios-d3-sources">
      {props.exchanges.length + props.wallets.length + props.brokers.length === 0 && <div className="ios-d3-onboarding">
        <div className="ios-d3-onboarding-art" aria-hidden="true">
          <svg viewBox="0 0 160 94" fill="none">
            <rect x="26" y="12" width="108" height="70" rx="14" stroke="currentColor" strokeWidth="2" opacity=".35" />
            <path d="M48 60h18l12-18 13 10 21-27" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="112" cy="25" r="5" fill="currentColor" />
          </svg>
        </div>
        <h2>{t("mobile.sources.gettingStarted")}</h2>
        <ol aria-label={t("mobile.sources.gettingStarted")}>
          {[1, 2, 3].map((step) => <li key={step}><span>{step}</span>{t(`mobile.sources.step.${step}`)}</li>)}
        </ol>
      </div>}
      {sections.map(({ kind, label, add, rows, options }) => (
        <section key={kind} aria-label={label} className="ios-d3-source-section space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ios-d3-section-heading">{label}</h2>
            <Button className="ios-d3-text-action min-h-11" variant="ghost" onClick={() => start(kind)}>{add}</Button>
          </div>
          <div className="ios-d3-source-group overflow-hidden rounded-2xl bg-card">
            {rows.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">{t("mobile.sources.empty")}</p> : rows.map((row, index) => {
              const identity = kind === "exchange" ? maskSensitive((row as ExchangeRow).apiKey)
                : kind === "wallet" ? truncateAddress((row as WalletRow).address)
                : maskSensitive((row as StockBrokerRow).queryId);
              const name = row.alias || options.find((option) => option.value === row.type)?.label || row.type;
              return <div key={`${row.type}-${index}`} className="ios-d3-source-row flex min-w-0 items-center gap-2 px-4 py-2">
                <span className="ios-d3-source-avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
                <button className="min-h-11 min-w-0 flex-1 text-left" onClick={() => start(kind, row)}>
                  <span className="block truncate font-medium">{name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{identity}</span>
                </button>
                <button type="button" role="switch" aria-checked={row.active}
                  className="ios-d3-source-switch" aria-label={`${t("mobile.sources.toggle")} ${name}`} onClick={() => {
                  haptic("selection");
                  if (kind === "exchange") props.onToggleExchange(row as ExchangeRow);
                  if (kind === "wallet") props.onToggleWallet(row as WalletRow);
                  if (kind === "broker") props.onToggleBroker(row as StockBrokerRow);
                }}><span aria-hidden="true" /></button>
                <button type="button" className="ios-d3-source-more" aria-label={t("mobile.sources.moreActions").replace("{source}", name)}
                  onClick={() => { haptic("selection"); setMenu({ kind, value: row, name }); }}><DotsHorizontalIcon aria-hidden="true" /></button>
              </div>;
            })}
          </div>
        </section>
      ))}
      {menu && <ActionSheet open onOpenChange={(open) => { if (!open) setMenu(undefined); }}
        title={menu.name} actions={[
          ...(props.isPro ? [{
            label: t("mobile.sources.quickLookSource").replace("{source}", menu.name),
            onClick: () => {
              if (menu.kind === "exchange") props.onQuickLookExchange?.(menu.value as ExchangeRow);
              if (menu.kind === "wallet") props.onQuickLookWallet?.(menu.value as WalletRow);
              if (menu.kind === "broker") props.onQuickLookBroker?.(menu.value as StockBrokerRow);
            },
          }] : []),
          { label: t("mobile.sources.deleteSource").replace("{source}", menu.name), destructive: true,
            onClick: () => setRemoval({ kind: menu.kind, value: menu.value }) },
        ]} />}
      {editor && <ModalPage title={t("mobile.sources.edit")} onDismiss={close}>
        <div className="ios-d3-source-editor mx-auto max-w-xl space-y-6">
          <div className="ios-d3-editor-nav flex items-center justify-between">
            <div className="flex items-center gap-2">
              {editor.step === 2 && !editor.original && <Button variant="ghost" className="min-h-11" onClick={() => setEditor({ ...editor, step: 1 })}>{t("common.back")}</Button>}
              <Button variant="ghost" className="min-h-11" onClick={close}>{t("common.cancel")}</Button>
            </div>
            <span className="text-sm text-muted-foreground">{editor.step} / 2</span>
          </div>
          <div className="ios-d3-editor-intro">
            <span className="ios-d3-source-avatar ios-d3-source-avatar-large" aria-hidden="true">
              {(sections.find((section) => section.kind === editor.kind)?.options.find((option) => option.value === editor.draft.type)?.label ?? editor.draft.type).slice(0, 2).toUpperCase()}
            </span>
            <h2 className="text-3xl font-bold">{editor.original ? t("mobile.sources.edit") : sections.find((section) => section.kind === editor.kind)?.add}</h2>
          </div>
          {editor.step === 1 ? <>
            <Label htmlFor="mobile-provider">{t("config.formType")}</Label>
            <select id="mobile-provider" className="ios-d3-provider-select mt-2 min-h-12 w-full rounded-xl bg-card px-3" value={editor.draft.type} onChange={(event) => {
              const type = event.target.value;
              if (editor.kind === "exchange" && type !== editor.draft.type) {
                const { password: _password, passphrase: _passphrase, ...rest } = editor.draft as ExchangeRow;
                setEditor({ ...editor, draft: { ...rest, type } });
              } else update({ type });
            }}>
              {sections.find((section) => section.kind === editor.kind)?.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <Button className="ios-d3-editor-primary min-h-12 w-full" onClick={() => setEditor({ ...editor, step: 2 })}>{t("mobile.sources.continue")}<ChevronRightIcon aria-hidden="true" /></Button>
          </> : <>
            <Field id="mobile-alias" label={t("config.formAlias")} value={editor.draft.alias ?? ""} onChange={(value) => update({ alias: value })} />
            {editor.kind === "exchange" && <>
              <Field id="mobile-api-key" label={t("config.formApiKey")} value={(editor.draft as ExchangeRow).apiKey} onChange={(value) => update({ apiKey: value })} onPaste={editor.original ? undefined : () => void paste("apiKey")} readOnly={!!editor.original} invalid={errorField === "apiKey"} />
              <Field id="mobile-secret" label={t("config.formApiSecret")} value={(editor.draft as ExchangeRow).secret} onChange={(value) => update({ secret: value })} secret onPaste={() => void paste("secret")} invalid={errorField === "secret"} />
              {editor.draft.type === "okex" && <Field id="mobile-password" label={t("config.formPassword")} value={(editor.draft as ExchangeRow).password ?? ""} onChange={(value) => update({ password: value })} secret onPaste={() => void paste("password")} invalid={errorField === "password"} />}
              {editor.draft.type === "bitget" && <Field id="mobile-passphrase" label={t("config.formPassphrase")} value={(editor.draft as ExchangeRow).passphrase ?? ""} onChange={(value) => update({ passphrase: value })} secret onPaste={() => void paste("passphrase")} invalid={errorField === "passphrase"} />}
            </>}
            {editor.kind === "wallet" && <Field id="mobile-address" label={t("config.formAddress")} value={(editor.draft as WalletRow).address} onChange={(value) => update({ address: value })} onPaste={editor.original ? undefined : () => void paste("address")} readOnly={!!editor.original} invalid={errorField === "address"} />}
            {editor.kind === "broker" && <>
              <Field id="mobile-token" label={t("config.formToken")} value={(editor.draft as StockBrokerRow).token} onChange={(value) => update({ token: value })} secret onPaste={() => void paste("token")} invalid={errorField === "token"} />
              <Field id="mobile-query-id" label={t("config.queryId")} value={(editor.draft as StockBrokerRow).queryId} onChange={(value) => update({ queryId: value })} onPaste={editor.original ? undefined : () => void paste("queryId")} readOnly={!!editor.original} invalid={errorField === "queryId"} />
            </>}
            {error && <p id="mobile-source-error" role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="ios-d3-editor-primary min-h-12 w-full" disabled={saving} onClick={() => void save()}>{t("config.saveChanges")}</Button>
          </>}
        </div>
      </ModalPage>}
      {removal && <ConfirmSheet title={t("config.removeDialogTitle")} onDismiss={() => setRemoval(undefined)}>
          <p className="py-2 text-center">{t("config.removeDialogDesc")}</p>
          <Button variant="destructive" className="min-h-12 w-full" onClick={remove}>{t("common.delete")}</Button>
          <Button variant="outline" className="min-h-12 w-full" onClick={() => setRemoval(undefined)}>{t("common.cancel")}</Button>
      </ConfirmSheet>}
    </div>
  );
}

function Field({ id, label, value, onChange, secret = false, onPaste, readOnly = false, invalid = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; secret?: boolean; onPaste?: () => void; readOnly?: boolean; invalid?: boolean;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  return <div className="ios-d3-source-field space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="ios-d3-field-control flex gap-2">
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} type={secret && !revealed ? "password" : "text"} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={invalid || undefined} aria-describedby={invalid ? "mobile-source-error" : undefined} className="min-h-12 min-w-0 flex-1 text-base" />
      {secret && <button type="button" className="ios-d3-reveal" aria-label={`${t("mobile.sources.holdReveal")} ${label}`}
        onPointerDown={() => setRevealed(true)} onPointerUp={() => setRevealed(false)}
        onPointerCancel={() => setRevealed(false)} onPointerLeave={() => setRevealed(false)}
        onBlur={() => setRevealed(false)} onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") setRevealed(true); }}
        onKeyUp={() => setRevealed(false)}><EyeOpenIcon aria-hidden="true" /></button>}
      {onPaste && <Button variant="outline" className="min-h-12" onClick={onPaste}>{t("mobile.sources.paste")}</Button>}
    </div>
  </div>;
}
