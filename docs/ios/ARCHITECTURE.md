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
files in the app sandbox. The app expects the device to have been unlocked
once after reboot. SQLite assets and transactions rely on iOS Data Protection
for at-rest protection; sensitive configuration and assistant content also
use app-layer encryption.

The recoverable rotation protocol atomically replaces `.ent-key` and uses
temporary files and a journal. iOS marks those key artifacts with
`NSURLIsExcludedFromBackupKey` as they are created and scans existing key
artifacts at startup. This prevents an iCloud or Finder backup from carrying
the encryption key beside the encrypted configuration. The existing legacy
default key remains for compatibility. After a device restore, configuration
encrypted with a custom key cannot be read from the restored database; the
user must import an exported configuration using its original key. Device
backup and restore behavior still needs validation on a signed build.

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

The iOS document picker exports an already written file from the app's
Documents directory. The frontend writes the file before opening the picker;
desktop exports continue writing to the selected path afterward. Automatic
backups on iOS use the app's Documents directory, with filesystem scope for
that directory. Backups are available through Files and Finder. Selecting
arbitrary external directories across launches is unavailable because the
current plugin does not retain security-scoped access.

After successful configuration and SQLite queries, the frontend waits for the
overview heading to render and invokes a Rust command that writes a readiness
marker in the app cache. Simulator CI checks that marker before taking its
screenshot.
