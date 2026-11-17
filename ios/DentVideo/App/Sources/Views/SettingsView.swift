import SwiftUI
import UIKit
@preconcurrency import UserNotifications
import DentVideoCore

/// The web's essential settings, plus this phone's notifications. The plan is shown read-only:
/// its name and state, never a price or a way to change it here.
struct SettingsView: View {
    @Environment(AppModel.self) private var model
    @State private var readyPush = Prefs.readyPush
    @State private var reminders = Prefs.postReminders
    @State private var suggestedTime = Prefs.reminderMinutes == nil
    @State private var reminderTime = Self.time(from: Prefs.reminderMinutes ?? 9 * 60)
    @State private var permission: UNAuthorizationStatus = .notDetermined
    @State private var deleting = false
    @State private var confirmSignOut = false

    var body: some View {
        NavigationStack {
            Form {
                if let clinic = model.me?.clinic {
                    Section(L("settings.clinic")) {
                        NavigationLink { ClinicDetailsForm(profile: clinic.profile) } label: {
                            row(L("settings.clinicDetails"), value: clinic.profile.name, icon: "building.2")
                        }
                        NavigationLink { VideoSettingsForm(profile: clinic.profile) } label: {
                            row(L("settings.videos"), value: L10n.languageName(clinic.profile.language), icon: "film")
                        }
                    }
                }

                Section {
                    if permission == .denied {
                        Button(L("settings.notifications.allowInSettings")) { openSystemSettings() }
                    } else if permission == .notDetermined {
                        Button(L("primer.allow")) { Task { await Notifications.requestAndRegister(); await reload() } }
                    }
                    Toggle(L("settings.readyPush"), isOn: $readyPush)
                        .onChange(of: readyPush) { _, v in
                            Prefs.readyPush = v
                            Task { await model.sendDevice() }
                        }
                    Toggle(L("settings.reminders"), isOn: $reminders)
                        .onChange(of: reminders) { _, v in
                            Prefs.postReminders = v
                            Task {
                                if v && permission == .notDetermined { await Notifications.requestAndRegister(); await reload() }
                                await Notifications.scheduleReminders(for: model.items)
                            }
                        }
                    if reminders {
                        Toggle(L("settings.reminders.suggested"), isOn: $suggestedTime)
                            .onChange(of: suggestedTime) { _, v in saveTime(v ? nil : reminderTime) }
                        if !suggestedTime {
                            DatePicker(L("settings.reminders.time"), selection: $reminderTime, displayedComponents: .hourAndMinute)
                                .onChange(of: reminderTime) { _, t in saveTime(t) }
                        }
                    }
                } header: {
                    Text(L("settings.notifications"))
                } footer: {
                    Text(L("settings.notifications.footer"))
                }
                .tint(Theme.teal)

                Section {
                    Button { openSystemSettings() } label: {
                        row(L("settings.appLanguage"), value: L10n.languageName(L10n.languageCode), icon: "globe")
                    }
                    .foregroundStyle(Theme.ink)
                } footer: {
                    Text(L("settings.appLanguage.footer"))
                }

                if let plan = model.me?.plan {
                    Section(L("settings.plan")) {
                        row(L("settings.plan.name"), value: planName(plan.tier), icon: "checkmark.seal")
                        row(L("settings.plan.state"), value: L("plan.state.\(plan.state.rawValue)"), icon: "circle.dashed")
                    }
                }

                Section(L("settings.help")) {
                    // Help center and terms left out on purpose: they cover billing and prices (3.1.3);
                    // support email instead. Privacy stays (5.1.1(i)).
                    if let mail = URL(string: "mailto:\(Config.supportEmail)") {
                        Link(destination: mail) { row(L("settings.contact"), value: Config.supportEmail, icon: "envelope") }
                    }
                    Link(destination: Config.page("privacy")) { row(L("legal.privacy"), icon: "hand.raised") }
                }
                .foregroundStyle(Theme.ink)

                Section {
                    if let email = model.me?.user.email {
                        Text(L("settings.signedInAs", email)).font(.footnote).foregroundStyle(Theme.muted)
                    }
                    Button(L("settings.signOut")) { confirmSignOut = true }
                    Button(L("settings.delete"), role: .destructive) { deleting = true }
                } header: {
                    Text(L("settings.account"))
                } footer: {
                    Text(L("settings.version", Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"))
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("tab.settings"))
            .task { await reload() }
            .confirmationDialog(L("settings.signOut.confirm"), isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button(L("settings.signOut"), role: .destructive) { Task { await model.signOut() } }
                Button(L("common.cancel"), role: .cancel) {}
            }
            .sheet(isPresented: $deleting) { DeleteAccountView() }
        }
    }

    private func row(_ title: String, value: String? = nil, icon: String) -> some View {
        HStack {
            Label(title, systemImage: icon)
            Spacer()
            if let value { Text(value).foregroundStyle(Theme.muted).lineLimit(1) }
        }
        .accessibilityElement(children: .combine)
    }

    private func planName(_ tier: String?) -> String {
        switch tier {
        case "starter"?: return "Starter"
        case "practice"?: return "Practice"
        case "group"?: return "Group"
        default: return "—"
        }
    }

    private func reload() async { permission = await Notifications.status() }

    private func saveTime(_ t: Date?) {
        if let t {
            let c = Calendar.current.dateComponents([.hour, .minute], from: t)
            Prefs.reminderMinutes = (c.hour ?? 9) * 60 + (c.minute ?? 0)
        } else {
            Prefs.reminderMinutes = nil
        }
        Task { await Notifications.scheduleReminders(for: model.items) }
    }

    private func openSystemSettings() {
        if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
    }

    static func time(from minutes: Int) -> Date {
        Calendar.current.date(bySettingHour: minutes / 60, minute: minutes % 60, second: 0, of: Date()) ?? Date()
    }
}

/// Name, city, Instagram handle, booking link, services: the clinic as the videos introduce it.
struct ClinicDetailsForm: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var profile: ClinicProfile
    @State private var newService = ""
    @State private var saving = false

    var body: some View {
        Form {
            Section {
                TextField(L("clinic.name"), text: $profile.name).textContentType(.organizationName)
                TextField(L("clinic.city"), text: Binding($profile.city, ""))
                    .textContentType(.addressCity)
                LabeledContent(L("clinic.country"), value: L10n.countryName(profile.country))
            } footer: {
                Text(L("clinic.country.footer"))
            }
            Section(L("clinic.online")) {
                TextField(L("clinic.handle"), text: Binding($profile.handle, ""))
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                TextField(L("clinic.booking"), text: Binding($profile.bookingUrl, ""))
                    .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
            }
            Section {
                ForEach(profile.services, id: \.self) { s in Text(s) }
                    .onDelete { profile.services.remove(atOffsets: $0) }
                HStack {
                    TextField(L("clinic.services.add"), text: $newService).onSubmit(addService)
                    Button(L("common.add"), action: addService).disabled(newService.trimmingCharacters(in: .whitespaces).count < 2 || profile.services.count >= 20)
                }
            } header: {
                Text(L("clinic.services"))
            } footer: {
                Text(L("clinic.services.footer"))
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper.ignoresSafeArea())
        .navigationTitle(L("settings.clinicDetails"))
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(L("common.save")) { Task { await save() } }
                    .disabled(saving || profile.name.trimmingCharacters(in: .whitespaces).isEmpty || profile.services.isEmpty)
            }
        }
    }

    private func addService() {
        let s = newService.trimmingCharacters(in: .whitespacesAndNewlines)
        guard s.count >= 2, s.count <= 60, !profile.services.contains(s), profile.services.count < 20 else { return }
        profile.services.append(s)
        newService = ""
    }

    private func save() async {
        saving = true
        defer { saving = false }
        if await model.saveProfile(profile) { dismiss() }
    }
}

/// Video language, narrator voice, tone and the closing line under every caption.
struct VideoSettingsForm: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var profile: ClinicProfile
    @State private var saving = false

    var body: some View {
        Form {
            Section {
                Picker(L("videos.language"), selection: $profile.language) {
                    ForEach(ClinicProfile.videoLanguages, id: \.self) { Text(L10n.languageName($0)).tag($0) }
                }
            } footer: {
                Text(L("videos.language.footer"))
            }
            Section {
                Picker(L("videos.narrator"), selection: Binding($profile.narratorVoice, "female")) {
                    Text(L("videos.narrator.female")).tag("female")
                    Text(L("videos.narrator.male")).tag("male")
                }
                Picker(L("videos.tone"), selection: Binding($profile.tone, "warm")) {
                    ForEach(["warm", "expert", "calm", "playful"], id: \.self) { Text(L("videos.tone.\($0)")).tag($0) }
                }
                Picker(L("videos.address"), selection: Binding($profile.address, "formal")) {
                    Text(L("videos.address.formal")).tag("formal")
                    Text(L("videos.address.informal")).tag("informal")
                }
            }
            Section {
                TextField(L("videos.closing.placeholder"), text: Binding($profile.closingLine, ""), axis: .vertical)
                    .lineLimit(2...4)
            } header: {
                Text(L("videos.closing"))
            } footer: {
                Text(L("videos.closing.footer"))
            }
        }
        .scrollContentBackground(.hidden)
        .background(Theme.paper.ignoresSafeArea())
        .navigationTitle(L("settings.videos"))
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(L("common.save")) {
                    Task {
                        saving = true
                        defer { saving = false }
                        if await model.saveProfile(profile) { dismiss() }
                    }
                }
                .disabled(saving)
            }
        }
    }
}

extension Binding where Value == String {
    /// An optional String field edited as text ("" = not set).
    init(_ source: Binding<String?>, _ empty: String) {
        self.init(get: { source.wrappedValue ?? empty }, set: { source.wrappedValue = $0.isEmpty ? nil : $0 })
    }
}

#Preview { SettingsView().environment(AppModel.preview()) }
