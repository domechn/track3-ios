import Foundation
import LocalAuthentication
import UIKit

private final class Track3PrivacyLock: NSObject {
    static let shared = Track3PrivacyLock()
    private let setting = "track3.ios.appLockEnabled"
    private let overlayTag = 0x74A3
    private var installed = false
    private var authenticating = false

    var enabled: Bool { UserDefaults.standard.bool(forKey: setting) }

    func install() {
        guard !installed else { return }
        installed = true
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(background), name: UIApplication.willResignActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(foreground), name: UIApplication.didBecomeActiveNotification, object: nil)
        center.addObserver(self, selector: #selector(windowVisible), name: UIWindow.didBecomeVisibleNotification, object: nil)
        if enabled {
            cover()
            if UIApplication.shared.applicationState == .active { authenticateForeground() }
        }
    }

    func setEnabled(_ value: Bool) {
        UserDefaults.standard.set(value, forKey: setting)
        if !value { DispatchQueue.main.async { self.uncover() } }
    }

    private var windows: [UIWindow] {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .filter { !$0.isHidden }
    }

    private func cover() {
        for window in windows where window.viewWithTag(overlayTag) == nil {
            let cover = UIView(frame: window.bounds)
            cover.tag = overlayTag
            cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            cover.backgroundColor = .systemBackground
            let stack = UIStackView()
            stack.axis = .vertical
            stack.alignment = .center
            stack.spacing = 18
            stack.translatesAutoresizingMaskIntoConstraints = false
            let title = UILabel()
            let chinese = Locale.preferredLanguages.first?.hasPrefix("zh") == true
            title.text = chinese ? "Track3 已锁定" : "Track3 is locked"
            title.font = .preferredFont(forTextStyle: .title2)
            let button = UIButton(type: .system)
            button.setTitle(chinese ? "解锁" : "Unlock", for: .normal)
            button.addTarget(self, action: #selector(retry), for: .touchUpInside)
            button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 24, bottom: 12, right: 24)
            stack.addArrangedSubview(title)
            stack.addArrangedSubview(button)
            cover.addSubview(stack)
            NSLayoutConstraint.activate([
                stack.centerXAnchor.constraint(equalTo: cover.centerXAnchor),
                stack.centerYAnchor.constraint(equalTo: cover.centerYAnchor),
            ])
            window.addSubview(cover)
        }
    }

    private func uncover() {
        for window in windows { window.viewWithTag(overlayTag)?.removeFromSuperview() }
    }

    @objc private func background() { cover() }

    @objc private func foreground() {
        if enabled { cover(); authenticateForeground() }
        else { uncover() }
    }

    @objc private func windowVisible() {
        if enabled {
            cover()
            if UIApplication.shared.applicationState == .active { authenticateForeground() }
        }
    }

    @objc private func retry() { authenticateForeground() }

    private func authenticateForeground() {
        guard enabled && !authenticating else { return }
        authenticating = true
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            authenticating = false
            return
        }
        let chinese = Locale.preferredLanguages.first?.hasPrefix("zh") == true
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: chinese ? "解锁 Track3" : "Unlock Track3") { success, _ in
            DispatchQueue.main.async {
                self.authenticating = false
                if success && self.enabled { self.uncover() }
            }
        }
    }
}

@_cdecl("track3_ios_install_native")
public func track3IOSInstallNative() {
    DispatchQueue.main.async { Track3PrivacyLock.shared.install() }
}

@_cdecl("track3_ios_lock_enabled")
public func track3IOSLockEnabled() -> Bool {
    Track3PrivacyLock.shared.enabled
}

@_cdecl("track3_ios_set_lock_enabled")
public func track3IOSSetLockEnabled(_ enabled: Bool) {
    Track3PrivacyLock.shared.setEnabled(enabled)
}

@_cdecl("track3_ios_authenticate")
public func track3IOSAuthenticate() -> Bool {
    let context = LAContext()
    var error: NSError?
    guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { return false }
    let semaphore = DispatchSemaphore(value: 0)
    var approved = false
    let chinese = Locale.preferredLanguages.first?.hasPrefix("zh") == true
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: chinese ? "更改 Track3 锁定设置" : "Change Track3 lock settings") { success, _ in
        approved = success
        semaphore.signal()
    }
    return semaphore.wait(timeout: .now() + 90) == .success && approved
}

@_cdecl("track3_ios_haptic")
public func track3IOSHaptic(_ kind: UInt8) {
    DispatchQueue.main.async {
        switch kind {
        case 1: UINotificationFeedbackGenerator().notificationOccurred(.success)
        case 2: UINotificationFeedbackGenerator().notificationOccurred(.error)
        default: UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}

@_cdecl("track3_ios_set_badge")
public func track3IOSSetBadge(_ count: Int32) {
    DispatchQueue.main.async {
        UIApplication.shared.applicationIconBadgeNumber = Int(max(0, count))
    }
}

@_cdecl("track3_ios_share_file")
public func track3IOSShareFile(_ path: UnsafePointer<CChar>) -> Bool {
    let source = URL(fileURLWithPath: String(cString: path))
    let staged = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".json")
    do { try FileManager.default.copyItem(at: source, to: staged) }
    catch { return false }
    DispatchQueue.main.async {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }),
              let root = window.rootViewController else {
            try? FileManager.default.removeItem(at: staged)
            return
        }
        let controller = UIActivityViewController(activityItems: [staged], applicationActivities: nil)
        controller.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: staged)
        }
        if let popover = controller.popoverPresentationController {
            popover.sourceView = root.view
            popover.sourceRect = CGRect(x: root.view.bounds.midX, y: root.view.bounds.maxY, width: 1, height: 1)
        }
        var presenter = root
        while let presented = presenter.presentedViewController { presenter = presented }
        presenter.present(controller, animated: true)
    }
    return true
}
