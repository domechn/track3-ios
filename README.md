# Track3 for iPhone

Track3 is a local-first portfolio tracker for cryptocurrency and stocks.
The iPhone app keeps the desktop Tauri v2 architecture: a React interface
inside WKWebView calls the shared Rust core. Portfolio history lives in the
app's SQLite database. Exchange credentials, wallet configuration, sync
secrets and assistant sessions use application encryption; iOS Data
Protection protects app files at rest.

## What you can do

- Track Binance, OKX, Bitget, Gate.io, Kraken, Coinbase, Bybit, HTX, MEXC,
  Backpack, supported blockchain wallets, Interactive Brokers Flex, and
  custom holdings.
- View portfolio totals, allocation, profit and loss, attribution, wallet and
  asset history, snapshot comparisons, and FIFO/LIFO/HIFO/Average cost basis.
- Review history, delete and undo snapshots, set goals and alerts, calculate
  rebalances, and use the AI assistant with a provider you configure.
- Export or import JSON through Files, use automatic monthly backups in
  Documents, and optionally sync encrypted data through an S3 bucket you
  control.
- Use an optional passcode or biometric app lock. An app-switcher privacy
  cover hides the portfolio when Track3 becomes inactive.
- Switch between English and Simplified Chinese, light and dark themes, and
  follow the system appearance. Pro licensing enables its existing data
  sources and features.

The phone interface uses Overview, History, Analytics and More tabs. Detail
pages use Back navigation and touch sheets. Charts support touch inspection;
refresh is available in the header or by pulling down.
[Feature parity](docs/ios/FEATURE_PARITY.md) maps each desktop feature to its
iPhone control.

## Screenshots

The Playwright iPhone suite saves viewport images in `test-results/mobile/`,
including `ios-se-overview.png`, `ios-14-history.png`,
`ios-pro-max-summary.png`, `ios-pro-max-profit.png`, `ios-se-first-launch.png`,
`ios-14-created-goal.png`, and `ios-pro-max-assistant.png`. These are generated test
artifacts, so run the browser suite to create them locally. The macOS CI
simulator job saves `artifacts/iphone-initial.png` and
`artifacts/iphone-launch.png` and attempts to upload them with its run.

## Build and run

An iOS build requires macOS with Xcode, Xcode command line tools, Rust
1.94.1 or newer with the iOS targets, Node.js 24 or newer, and Corepack
Yarn 4.9.2. This Linux checkout can run frontend and pure Rust checks but
cannot compile or launch an iOS app.

```bash
corepack yarn install --immutable
corepack yarn tsc --noEmit
corepack yarn vitest run
corepack yarn playwright install chromium
corepack yarn playwright test tests/e2e/mobile.spec.ts tests/e2e/ios-settings.spec.ts tests/e2e/ios-parity.spec.ts
corepack yarn build
cd src-tauri && cargo test --locked -p track3-pure-tests --lib
```

On a Mac, install the Rust targets and use Tauri's iOS commands:

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
corepack yarn tauri ios dev
corepack yarn tauri ios build --target aarch64-sim --debug --no-sign --ci
corepack yarn tauri ios build --target aarch64 --debug --no-sign --ci
```

The committed Xcode project is in `src-tauri/gen/apple`. Do not regenerate
its settings without running `python3 scripts/ios/configure-project.py`.
GitHub Actions' [iOS workflow](.github/workflows/ios-foundation.yml) checks
the project, compiles both Rust targets, builds an unsigned simulator app and
device IPA, launches a simulator, and captures screenshots. Its web job
checks TypeScript, Vitest, mobile Playwright flows, and Rust pure tests.

## Signing and TestFlight

An unsigned IPA cannot be installed on a physical iPhone. Set the Apple
development team and `dev.track3.ios` App ID for the Track3 target in Xcode,
enable the default Data Protection entitlement in the provisioning profile,
archive a device release build, sign with an Apple Distribution certificate,
and upload through Xcode Organizer or App Store Connect. See the
[release checklist](docs/ios/RELEASE.md) for device validation and restore
preparation.

## Privacy and iOS limits

Track3 does not require a Track3 account. Portfolio records remain local
unless you export them or turn on optional S3 sync. Price lookups, exchange
and wallet refreshes, license verification, and a configured AI provider
send the data needed for those requests to their respective services.
The AI assistant can propose changes; only the confirmation card can
execute an approved action.

iOS may suspend the app after it enters the background, so scheduled refresh,
automatic backup and sync are reliable only while Track3 is active. Automatic
backup files live in Track3's Documents folder in Files. An iCloud Drive copy
must be moved there by the user. Camera address scanning is not implemented;
wallet addresses can be typed or pasted. Desktop window controls, tray
features, keyboard shortcuts and the in-app updater have no iPhone control.
The Xcode target supports iPhone only; an iPad layout has not been designed or tested.
External digital subscription checkout links are excluded from the iPhone
app; existing license entry remains available.

The generated encryption key is device-bound and excluded from backups.
Before relying on a device restore, set and retain a known encryption key in
Security, then export configuration and keep the key separately. See
[architecture](docs/ios/ARCHITECTURE.md) and [release notes](docs/ios/RELEASE.md)
for details.
