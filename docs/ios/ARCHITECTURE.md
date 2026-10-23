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

Fresh iOS installs create a random `.ent-key` before the database is
initialized. It is stored with mode `0600` in app data under iOS Data
Protection and excluded from iCloud and Finder backups. This is a protected
random file rather than a Keychain item because the existing recoverable
key rotation protocol atomically replaces `.ent-key` alongside database and
session ciphertext; keeping another Keychain copy would require a second
recovery transaction. Installs that already have a database but no key
continue to use the legacy key, so an app update does not make existing
secrets unreadable.

The recoverable rotation protocol atomically replaces `.ent-key` and uses
temporary files and a journal. iOS marks those key artifacts with
`NSURLIsExcludedFromBackupKey` as they are created and scans existing key
artifacts at startup. This prevents an iCloud or Finder backup from carrying
the encryption key beside the encrypted configuration. After a device restore,
configuration encrypted on iOS cannot be read from the restored database.
When the key is absent, the app checks encrypted configuration against the
legacy key. If it cannot decrypt, it displays a persistent notice linking to
Settings so the user can re-enter exchange and service credentials. Existing
legacy installations with readable configuration do not show the notice.
The generated key is not shown to users, so an export encrypted with that
default key is also unrecoverable after restore. For a recoverable
configuration export, the user must first set a known key with Data
Management's Update Encryption Key control, then export the configuration
and keep that key separately. The import flow can decrypt with the supplied
key. Device
backup and restore behavior still needs validation on a signed build.

`scripts/ios/configure-project.py` applies the Data Protection entitlement and
syncs Xcode version settings from `tauri.conf.json`. The committed Info.plist
reads those settings. `src-tauri/Info.ios.plist`
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

The iOS document picker creates an empty file under a unique name in Documents.
The frontend stages export content under the app cache, copies it to the
selected path after the picker closes, and removes the cache file. It removes
the empty Documents placeholder on cancellation or after a successful export
to an external path. It keeps the selected Documents file when the picker
returns that path with or without iOS's `/private` alias.
This prevents an earlier Documents export from being overwritten or deleted
when the user cancels. Desktop exports write directly to the selected path.
Automatic
backups on iOS use the app's Documents directory, with filesystem scope for
that directory. Backups are available through Files and Finder. Selecting
arbitrary external directories across launches is unavailable because the
current plugin does not retain security-scoped access.

The simulator debug build enables a frontend probe that waits for the overview
heading and invokes a debug-only Rust command to write a readiness marker in
the app cache, even when data loading fails or charts remain busy. CI polls
for that marker after capturing its screenshot and logs.
