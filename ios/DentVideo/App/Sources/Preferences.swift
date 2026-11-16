import Foundation

/// Per-phone settings (UserDefaults). The clinic's settings live on the server.
enum Prefs {
    private static let d = UserDefaults.standard

    /// "Your week is ready" push on this phone (sent to the server with the device token).
    static var readyPush: Bool {
        get { d.object(forKey: "pref.readyPush") as? Bool ?? true }
        set { d.set(newValue, forKey: "pref.readyPush") }
    }

    /// Local reminders at each approved video's posting time. Off until the dentist turns them on.
    static var postReminders: Bool {
        get { d.bool(forKey: "pref.postReminders") }
        set { d.set(newValue, forKey: "pref.postReminders") }
    }

    /// nil = the suggested time of each video; else minutes after midnight for every reminder.
    static var reminderMinutes: Int? {
        get { d.object(forKey: "pref.reminderMinutes") as? Int }
        set { if let v = newValue { d.set(v, forKey: "pref.reminderMinutes") } else { d.removeObject(forKey: "pref.reminderMinutes") } }
    }

    /// Asked once, after the first sign-in, with our own explanation first.
    static var askedForNotifications: Bool {
        get { d.bool(forKey: "pref.askedNotifications") }
        set { d.set(newValue, forKey: "pref.askedNotifications") }
    }

    static func clear() {
        for k in ["pref.readyPush", "pref.postReminders", "pref.reminderMinutes", "pref.askedNotifications"] { d.removeObject(forKey: k) }
    }
}
