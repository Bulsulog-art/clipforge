import SwiftUI
import UIKit

struct NewProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var url = ""
    @State private var niche: String
    @State private var sending = false
    @State private var showPaywall = false
    @State private var error: String?
    @State private var bgMusic: Bool = true
    @State private var bgMusicMood: String = "auto"
    let seed: NewProjectSeed?
    let onCreated: () -> Void

    init(seed: NewProjectSeed? = nil, onCreated: @escaping () -> Void) {
        self.seed = seed
        self.onCreated = onCreated
        _niche = State(initialValue: seed?.niche ?? "motivation")
    }

    private let niches = ["motivation", "business", "finance", "health", "tech",
                          "education", "comedy", "fitness", "spirituality"]
    private let moods: [(label: String, value: String)] = [
        ("Auto (match niche)", "auto"),
        ("Hype",               "hype"),
        ("Motivational",       "motivational"),
        ("Cinematic",          "cinematic"),
        ("Dramatic",           "dramatic"),
        ("Lofi",               "lofi"),
        ("Chill",              "chill"),
        ("Comedic",            "comedic"),
    ]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: "creditcard.circle.fill")
                            .foregroundStyle(.brand)
                        Text("Balance")
                        Spacer()
                        Text("\(credits.balance) credits")
                            .foregroundStyle(.secondary)
                    }
                    Button {
                        showPaywall = true
                    } label: {
                        Label("Buy more credits", systemImage: "plus.circle.fill")
                    }
                    .tint(.brand)
                }

                if let hook = seed?.hook {
                    Section {
                        VStack(alignment: .leading, spacing: 6) {
                            Label("Trending hook", systemImage: "sparkles")
                                .font(.caption.bold())
                                .foregroundStyle(.brand)
                            Text("\"\(hook)\"")
                                .font(.callout.italic())
                            Text("Drop a video that fits this hook — we'll auto-pick the moment.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Video source") {
                    HStack(spacing: 8) {
                        TextField("YouTube or TikTok URL", text: $url)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.URL)
                            .autocorrectionDisabled()
                            .textContentType(.URL)
                            .submitLabel(.go)
                            .onSubmit { Task { await submit() } }
                        if !url.isEmpty {
                            Button {
                                url = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(.tertiary)
                            }
                            .buttonStyle(.borderless)
                        } else {
                            Button {
                                if let s = UIPasteboard.general.string { url = s }
                            } label: {
                                Image(systemName: "doc.on.clipboard")
                                    .font(.callout)
                                    .foregroundStyle(.brand)
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                    if !url.isEmpty && !SourceURL.isValid(url) {
                        Label("Paste a YouTube or TikTok link", systemImage: "exclamationmark.triangle.fill")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }
                }

                Section("Niche") {
                    Picker("Niche", selection: $niche) {
                        ForEach(niches, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                }

                Section {
                    Toggle(isOn: $bgMusic) {
                        Label("Background music", systemImage: "music.note")
                    }
                    if bgMusic {
                        Picker(selection: $bgMusicMood) {
                            ForEach(moods, id: \.value) { Text($0.label).tag($0.value) }
                        } label: {
                            Label("Mood", systemImage: "waveform")
                        }
                    }
                } header: {
                    Text("Audio")
                } footer: {
                    Text(bgMusic
                         ? "Adds a low-volume soundtrack matched to your niche. We duck under voice so dialogue stays clear."
                         : "Voice-only render. Use this if your source already has music.")
                        .font(.caption2)
                }

                if let error {
                    Section { Text(error).foregroundStyle(.red).font(.callout) }
                }

                Section {
                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if sending { ProgressView() }
                            Text(credits.balance >= 1 ? "Generate clips · 1 credit" : "Get credits — Plus")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .tint(.brand)
                    // URL must be valid; allow tap with 0 credits so we can open the paywall
                    .disabled(!SourceURL.isValid(url) || sending)
                }
            }
            .navigationTitle("New project")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .sheet(isPresented: $showPaywall) {
                CreditsPaywallView()
            }
            .task { await credits.refresh() }
        }
    }

    private func submit() async {
        // No credits → show paywall instead of API call
        guard credits.canStartVideo() else { showPaywall = true; return }

        sending = true
        defer { sending = false }
        do {
            let jobId = try await ClipForgeAPI.shared.createJob(
                sourceUrl: url,
                niche: niche,
                bgMusic: bgMusic,
                bgMusicMood: bgMusicMood == "auto" ? nil : bgMusicMood
            )
            if !jobId.isEmpty {
                RenderActivityKit.start(
                    jobId: jobId,
                    title: niche.capitalized + " clip set",
                    expectedClips: 12
                )
            }
            await credits.refresh()
            onCreated()
            dismiss()
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch let e {
            error = e.localizedDescription
        }
    }
}
