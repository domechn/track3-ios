# iOS port progress

## S1 foundation

- Run `39926851914` failed in the simulator launch step after printing
  `getpwuid_r did not find a match for uid 501`. Its script did not identify
  the failing command, and the artifact upload hit the account quota. The
  earlier run `39923565686` built both iOS targets and passed simulator
  launch, but its screenshot artifact upload also hit the quota.
- The Xcode project from run `39926851914` was recovered from its CI log and
  is present in `src-tauri/gen/apple` for the driver to commit. Its
  Info.plist and project configuration now include the bundle display name,
  permission descriptions, document sharing, and portrait iPhone orientation.
  The project YAML and Info.plist values were checked locally for agreement.
- The simulator step now traces commands, captures and prints the screenshot
  and launch logs before readiness checks, and polls for the readiness marker
  for up to 60 seconds. It captures a second screenshot after readiness for
  the final artifact. The marker accepts a rendered overview heading even
  when charts are busy and is attempted after startup data loading succeeds
  or fails. The probe is included only in CI's debug frontend and debug Rust
  command registration. The workflow again uploads the zipped simulator
  `.app` and unsigned device `.ipa` with one-day retention.
- Fresh iOS installs now create a random, backup-excluded `.ent-key` before
  database initialization. Existing databases without a key keep legacy
  compatibility. iOS exports stage content in cache under a unique name and
  copy it after picker selection, so cancellation cannot overwrite or remove
  a prior Documents export. A configuration export made under the generated
  key cannot be recovered after device restore; the user must rotate to a
  known key before making a recoverable configuration export.
- Local `corepack yarn tsc --noEmit` passed, `corepack yarn vitest run`
  passed (1,714 tests in 200 files), and Rust pure tests passed (59 tests).
  The Rust tests exercise random key creation and existing-install
  compatibility. A Vite build with the CI readiness probe enabled passed.

The S1 exit condition is **not yet met**. The driver must commit and push
this worktree, then provide the macOS CI result. A green simulator run and a
rendered screenshot are still required. GitHub Actions artifact storage
must be cleared by the repository owner for the `.app`, `.ipa`, and screenshot
uploads to succeed. Physical device and signed build checks remain pending.
