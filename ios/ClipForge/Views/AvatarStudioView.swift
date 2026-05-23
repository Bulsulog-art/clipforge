import SwiftUI

/// Talking-head studio. Write a 10–60s script, pick an avatar, render a
/// 9:16 clip. Costs 5 credits.
struct AvatarStudioView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var script: String = ""
    @State private var avatars: [ClipForgeAPI.Avatar] = []
    @State private var selectedAvatarId: String?
    @State private var loading = false
    @State private var submitting = false
    @State private var bgMusic = true
    @State private var niche = "motivation"
    @State private var error: String?
    @State private var showSuccess = false
    @State private var showPaywall = false
    let onSubmitted: () -> Void

    private let niches = ["motivation", "business", "finance", "health", "tech",
                          "education", "comedy", "fitness", "spirituality"]
    private let scriptLimit = 600

    private var selectedAvatar: ClipForgeAPI.Avatar? {
        avatars.first(where: { $0.id == selectedAvatarId })
    }

    private var estimatedSeconds: Int {
        // ~150 words/min for natural narration
        let words = script.split(separator: " ").count
        return max(1, Int(round(Double(words) / 2.5)))
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: "creditcard.circle.fill").foregroundStyle(.brand)
                        Text("Balance")
                        Spacer()
                        Text("\(credits.balance) credits")
                            .foregroundStyle(.secondary)
                    }
                    Label("AI avatar render: 5 credits", systemImage: "sparkles")
                        .font(.callout)
                    Button {
                        showPaywall = true
                    } label: {
                        Label("Buy more credits", systemImage: "plus.circle")
                    }
                    .tint(.brand)
                }

                Section("Script") {
                    ZStack(alignment: .topLeading) {
                        if script.isEmpty {
                            Text("\"Three habits that quietly compound — first…\"")
                                .foregroundStyle(.tertiary)
                                .padding(.top, 8)
                                .padding(.leading, 4)
                        }
                        TextEditor(text: $script)
                            .frame(minHeight: 120)
                            .onChange(of: script) { _, new in
                                if new.count > scriptLimit { script = String(new.prefix(scriptLimit)) }
                            }
                    }
                    HStack {
                        Text("~\(estimatedSeconds)s spoken")
                        Spacer()
                        Text("\(script.count) / \(scriptLimit)")
                    }
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                }

                Section("Avatar") {
                    if loading {
                        HStack { ProgressView(); Text("Loading avatars…") }
                    } else if avatars.isEmpty {
                        Text("No avatars available yet.").foregroundStyle(.secondary).font(.callout)
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(avatars) { a in
                                    avatarCard(a)
                                        .onTapGesture {
                                            selectedAvatarId = a.id
                                        }
                                }
                            }
                            .padding(.vertical, 4)
                        }
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
                } footer: {
                    Text("We pick a track that matches your niche and duck it under the voice.")
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
                            if submitting { ProgressView() }
                            Text(canSubmit
                                 ? "Render avatar · 5 credits"
                                 : (credits.balance < 5 ? "Need 5 credits" : "Pick avatar & write script"))
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .tint(.brand)
                    .disabled(!canSubmit || submitting)
                }
            }
            .navigationTitle("AI Avatar")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
            .task {
                await credits.refresh()
                await loadAvatars()
            }
            .sheet(isPresented: $showPaywall) { CreditsPaywallView() }
            .alert("Avatar queued", isPresented: $showSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("Your AI avatar is rendering. We'll send a push when it's ready (about 2 minutes).")
            }
        }
    }

    private var canSubmit: Bool {
        !script.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && selectedAvatarId != nil
            && credits.balance >= 5
    }

    @ViewBuilder
    private func avatarCard(_ a: ClipForgeAPI.Avatar) -> some View {
        let isSelected = a.id == selectedAvatarId
        VStack(spacing: 6) {
            ZStack {
                if let urlStr = a.imageUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { img in
                        img.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color.gray.opacity(0.2)
                    }
                    .frame(width: 92, height: 92)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                } else {
                    Image(systemName: "person.crop.circle")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 92, height: 92)
                        .foregroundStyle(.secondary)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Color.brand : Color.clear, lineWidth: 3)
            )
            Text(a.name)
                .font(.caption)
                .foregroundStyle(isSelected ? Color.brand : .primary)
            if let p = a.description {
                Text(p)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(width: 100)
            }
        }
        .frame(width: 110)
    }

    private func loadAvatars() async {
        loading = true
        defer { loading = false }
        do {
            avatars = try await ClipForgeAPI.shared.fetchAvatars()
            if selectedAvatarId == nil { selectedAvatarId = avatars.first?.id }
        } catch {
            self.error = "Couldn't load avatars: \(error.localizedDescription)"
        }
    }

    private func submit() async {
        guard let id = selectedAvatarId,
              let voice = selectedAvatar?.defaultVoiceId else { return }
        submitting = true
        defer { submitting = false }
        error = nil
        do {
            let avatarJobId = try await ClipForgeAPI.shared.createAvatarJob(
                script: script.trimmingCharacters(in: .whitespacesAndNewlines),
                avatarId: id,
                voiceId: voice,
                niche: niche,
                bgMusic: bgMusic
            )
            // Pin the Live Activity to Lock Screen + Dynamic Island so the user
            // can watch SadTalker progress without staying inside the app.
            if !avatarJobId.isEmpty {
                RenderActivityKit.start(
                    jobId: avatarJobId,
                    title: "AI Avatar — \(niche.capitalized)",
                    expectedClips: 1
                )
            }
            DailyPickService.rememberNiche(niche)
            onSubmitted()
            showSuccess = true
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}
