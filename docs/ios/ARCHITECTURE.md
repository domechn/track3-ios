# Track3 iOS foundation

Track3 keeps its Tauri v2 architecture: the existing React application runs in
WKWebView and invokes the Rust core. The existing SQL migrations, refresh
persistence, sync persistence, encryption, and key rotation code remain shared
with desktop. The iOS identifier is `dev.track3.ios`; the desktop identifier
remains unchanged.

## Storage and secrets

Tauri resolves `app_data_dir`, `app_config_dir`, `app_cache_dir`, and
`resource_dir` inside the iOS app sandbox. SQLite and assistant session files
live under application data, coin logos under cache, and bundled migration SQL
under resources. Startup still resolves any legacy configuration database
before creating a new database. Frontend SQL uses the Rust-selected absolute
database URL, so it opens the same database as migrations and refresh.

The generated iOS Xcode project sets
`com.apple.developer.default-data-protection` to
`NSFileProtectionCompleteUntilFirstUserAuthentication`. This is iOS Data
Protection backed by the device passcode and hardware keys, and applies to new
files in the app sandbox, including `.ent-key`, SQLite files, rotation journals,
and encrypted session files. This preserves the recoverable key rotation
protocol, which atomically replaces `.ent-key`; storing only a second copy in
Keychain would break that atomic protocol. The app expects the device to have
been unlocked once after reboot. The existing legacy default encryption key
is retained for compatibility with existing data. SQLite assets and
transactions still rely on iOS Data Protection for at-rest protection, while
sensitive configuration and assistant content also use app-layer encryption.
Device backup and restore policy needs validation on a signed device build.

`scripts/ios/configure-project.py` applies the Data Protection entitlement to
the generated `project.yml` and entitlements file. `src-tauri/Info.ios.plist`
supplies display name, permissions copy, file sharing, and orientations when
Tauri generates or refreshes the project.

## Platform behavior

Desktop updater, process relaunch, shell, and right-click menu are omitted on
iOS. Dialog, filesystem, HTTP, opener, notification, and SQL plugins remain
available. The frontend platform provider exposes iOS and phone detection,
safe-area insets, and visual-viewport keyboard overlap. The current desktop UI
is still present; later steps replace its navigation and interactions for
phones. The iOS default theme follows the system unless a saved preference
overrides it.

The desktop-only assistant chat export CLI uses a macOS home directory. It is
not invoked by the mobile app or built as part of the mobile library target.
Rust persistence modules otherwise use paths supplied by Tauri and standard
file APIs within the sandbox. `fs2` instance locking and `libc::O_NOFOLLOW`
remain supported Unix operations; key rotation keeps its existing fsync and
recovery behavior.
