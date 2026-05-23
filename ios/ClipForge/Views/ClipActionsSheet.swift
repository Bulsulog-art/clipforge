import SwiftUI
import PhotosUI

struct ClipActionsSheet: View {
    let clip: Clip
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @StateObject private var channels = ChannelsService.shared
    @State private var faceImage: PhotosPickerItem?
    @State private var selectedLanguage = "en"
    @State private var voiceClone = false
    @State private var sending = false
    @State private var lastResult: String?
    @State private var error: String?
    @State private var showPaywall = false
    @State private var saving = false
    @State private var showFaceSwapConsent = false
    @State private var showPublishSheet = false
    @State private var derivatives: [ClipForgeAPI.Derivative] = []
    @State private var compareWith: ClipForgeAPI.Derivative?
    @State private var remixing = false
    @State private var remixError: String?
    @State private var remixedJobId: String?
    @AppStorage("faceSwapConsentGivenAt") private var faceSwapConsentGivenAt: Double = 0

    private let languages: [(code: String, label: String, flag: String)] = [
        ("en", "English", "🇺🇸"),
        ("tr", "Türkçe", "🇹🇷"),
        ("es", "Español", "🇪🇸"),
        ("fr", "Français", "🇫🇷"),
        ("de", "Deutsch", "🇩🇪"),
        ("pt", "Português", "🇵🇹"),
        ("ar", "العربية", "🇸🇦"),
        ("ja", "日本語", "🇯🇵"),
        ("ko", "한국어", "🇰🇷"),
        ("hi", "हिन्दी", "🇮🇳"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    creditsBadge

                    publishSection
                    Divider().background(Color.white.opacity(0.1))

                    if let compare = readyFaceSwapDerivative {
                        compareSection(derivative: compare)
                        Divider().background(Color.white.opacity(0.1))
                    }

                    Section_h("🎭 Swap face (2 credits)")
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Upload a portrait photo — we'll replace the face in this clip.")
                            .font(.callout)
                            .foregroundStyle(.secondary)

                        PhotosPicker(selection: $faceImage, matching: .images, photoLibrary: .shared()) {
                            HStack {
                                Image(systemName: "person.crop.square.filled.and.at.rectangle")
                                Text(faceImage == nil ? "Pick a face photo" : "Photo selected ✓")
                                Spacer()
                                Image(systemName: "chevron.right")
                            }
                            .padding()
                            .background(Color.cardBackground)
                            .clipShape(.rect(cornerRadius: 12))
                        }
                        .tint(.brand)

                        Button {
                            if faceSwapConsentGivenAt > 0 {
                                Task { await runFaceSwap() }
                            } else {
                                showFaceSwapConsent = true
                            }
                        } label: {
                            HStack { Spacer(); Text("Face swap now").fontWeight(.semibold); Spacer() }
                                .padding()
                                .background(Color.brand)
                                .foregroundStyle(.white)
                                .clipShape(.rect(cornerRadius: 12))
                        }
                        .disabled(faceImage == nil || sending)
                    }

                    Divider().background(Color.white.opacity(0.1))

                    Section_h("🌍 Translate captions (2 credits)")
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Reach global audiences. Pro: clone your voice in 40+ languages.")
                            .font(.callout)
                            .foregroundStyle(.secondary)

                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            ForEach(languages, id: \.code) { lang in
                                Button { selectedLanguage = lang.code } label: {
                                    HStack {
                                        Text(lang.flag).font(.title3)
                                        Text(lang.label).font(.callout)
                                        Spacer()
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 10)
                                    .background(selectedLanguage == lang.code ? Color.brand.opacity(0.18) : Color.cardBackground)
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(selectedLanguage == lang.code ? Color.brand : .clear, lineWidth: 1.5))
                                    .clipShape(.rect(cornerRadius: 10))
                                    .foregroundStyle(.primary)
                                }
                            }
                        }

                        Toggle(isOn: $voiceClone) {
                            VStack(alignment: .leading) {
                                Text("Clone my voice (5 credits)").font(.callout)
                                Text("Pro plan only — mouth-synced new audio").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                        .tint(.brand)

                        Button {
                            Task { await runTranslation() }
                        } label: {
                            HStack { Spacer(); Text("Translate now").fontWeight(.semibold); Spacer() }
                                .padding()
                                .background(Color.brand)
                                .foregroundStyle(.white)
                                .clipShape(.rect(cornerRadius: 12))
                        }
                        .disabled(sending)
                    }

                    Divider().background(Color.white.opacity(0.1))

                    remixSection
                    Divider().background(Color.white.opacity(0.1))

                    Section_h("📥 Export")
                    Button {
                        Task { await saveToPhotos() }
                    } label: {
                        HStack {
                            if saving { ProgressView().tint(.white) } else {
                                Image(systemName: "square.and.arrow.down.fill")
                            }
                            Text(saving ? "Saving…" : "Save to Photos")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                        .padding()
                        .background(
                            LinearGradient(
                                colors: [.brand, .brandGlow],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(.rect(cornerRadius: 12))
                    }
                    .disabled(saving || clip.storagePath == nil)

                    if let lastResult {
                        Text(lastResult)
                            .padding()
                            .background(Color.green.opacity(0.12))
                            .clipShape(.rect(cornerRadius: 10))
                            .font(.callout)
                    }
                    if let error {
                        Text(error)
                            .padding()
                            .background(Color.red.opacity(0.12))
                            .clipShape(.rect(cornerRadius: 10))
                            .font(.callout)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle("AI tools")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } }
            }
            .sheet(isPresented: $showPaywall) { CreditsPaywallView() }
            .sheet(isPresented: $showPublishSheet) {
                ClipPublishSheet(clip: clip)
            }
            .sheet(item: $compareWith) { d in
                ClipBeforeAfterSheet(originalClip: clip, derivative: d)
            }
            .alert("Face Swap Consent", isPresented: $showFaceSwapConsent) {
                Button("Cancel", role: .cancel) { }
                Button("I confirm — start swap") {
                    faceSwapConsentGivenAt = Date().timeIntervalSince1970
                    Task { await runFaceSwap() }
                }
            } message: {
                Text("By tapping confirm, you certify that the face image you uploaded is YOUR OWN face, OR that you have explicit written consent from the person whose face this is.\n\nClipForge prohibits using Face Swap to impersonate, harass, defame, deceive, or otherwise infringe on others' rights. Violations may result in account suspension.\n\nAll uploaded face images are encrypted at rest and deleted on account deletion.")
            }
            .background(Color.appBackground.ignoresSafeArea())
            .task {
                await credits.refresh()
                await channels.refresh()
                await loadDerivatives()
            }
        }
    }

    /// The first ready face-swap derivative for this clip, if any. Drives the
    /// Compare section visibility.
    private var readyFaceSwapDerivative: ClipForgeAPI.Derivative? {
        derivatives.first { $0.kind == "face_swap" && $0.status == "ready" && $0.storagePath != nil }
    }

    /// Re-renders the same source video as a new job. Different score-step
    /// roll picks different moments so the remix isn't a carbon copy — useful
    /// when one clip from a job goes viral and the user wants more chances
    /// from the same long-form source.
    private var remixSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Section_h("🔁 Remix this source")
            Text("Re-run the same source video and let the AI surface different moments. Costs 1 credit, same as a normal render.")
                .font(.callout)
                .foregroundStyle(.secondary)
            if let jobId = remixedJobId {
                Label("New render queued — find it in Studio.", systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)
                Text("Job id: \(jobId.prefix(8))…")
                    .font(.caption2.monospaced())
                    .foregroundStyle(.tertiary)
            } else {
                Button {
                    Task { await remix() }
                } label: {
                    HStack {
                        if remixing { ProgressView().tint(.white) }
                        Image(systemName: remixing ? "" : "arrow.triangle.2.circlepath")
                            .opacity(remixing ? 0 : 1)
                        Text(remixing ? "Queuing remix…" : "Remix · 1 credit")
                            .fontWeight(.semibold)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .opacity(0.7)
                    }
                    .padding()
                    .background(
                        LinearGradient(
                            colors: [.indigo, .purple],
                            startPoint: .leading, endPoint: .trailing
                        )
                    )
                    .foregroundStyle(.white)
                    .clipShape(.rect(cornerRadius: 12))
                }
                .buttonStyle(.plain)
                .disabled(remixing || (clip.jobId ?? "").isEmpty)
            }
            if let err = remixError {
                Text(err).font(.caption2).foregroundStyle(.red)
            }
        }
    }

    private func remix() async {
        remixing = true
        remixError = nil
        defer { remixing = false }
        do {
            let newJobId = try await ClipForgeAPI.shared.remixClip(id: clip.id)
            remixedJobId = newJobId
            // Light up a Live Activity for the new job so the user can track
            // it from the Dynamic Island without leaving the sheet open.
            if !newJobId.isEmpty {
                RenderActivityKit.start(
                    jobId: newJobId,
                    title: "Remix",
                    expectedClips: 12
                )
            }
            await Haptics.notify(.success)
            AnalyticsService.shared.track("clip_remixed", props: ["sourceClipId": clip.id])
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch {
            remixError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func compareSection(derivative: ClipForgeAPI.Derivative) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Section_h("🆚 Before / After")
            Text("Your face swap is ready. Drag the divider to compare the original with the swap.")
                .font(.callout)
                .foregroundStyle(.secondary)
            Button {
                Task { await Haptics.impact(.medium) }
                compareWith = derivative
            } label: {
                HStack {
                    Image(systemName: "rectangle.split.2x1.fill")
                    Text("Open before/after")
                        .fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .opacity(0.7)
                }
                .padding()
                .background(
                    LinearGradient(
                        colors: [.purple.opacity(0.85), .brand],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 12))
            }
            .buttonStyle(.plain)
        }
    }

    private func loadDerivatives() async {
        do {
            self.derivatives = try await ClipForgeAPI.shared.fetchDerivatives(forClipId: clip.id)
        } catch {
            // Non-blocking — Compare just won't surface until a refresh.
        }
    }

    private var publishSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Section_h("📡 Publish to channels")
            let connected = channels.connectedPlatforms
            Text(connected.isEmpty
                 ? "Connect TikTok / Instagram / YouTube once — then auto-post every clip from here."
                 : "Push this clip to \(connected.count) connected channel\(connected.count == 1 ? "" : "s") in one tap.")
                .font(.callout)
                .foregroundStyle(.secondary)

            if !connected.isEmpty {
                HStack(spacing: 8) {
                    ForEach(connected) { p in
                        Image(systemName: p.sfSymbol)
                            .frame(width: 30, height: 30)
                            .background(Color(red: p.accent.red, green: p.accent.green, blue: p.accent.blue).opacity(0.18))
                            .foregroundStyle(Color(red: p.accent.red, green: p.accent.green, blue: p.accent.blue))
                            .clipShape(Circle())
                    }
                    Spacer()
                }
            }

            Button {
                Task { await Haptics.impact(.medium) }
                showPublishSheet = true
            } label: {
                HStack {
                    if channels.loading {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: connected.isEmpty ? "antenna.radiowaves.left.and.right" : "paperplane.fill")
                    }
                    Text(connected.isEmpty ? "Set up channels" : "Choose channels & post")
                        .fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .opacity(0.7)
                }
                .padding()
                .background(
                    LinearGradient(
                        colors: [.brand, .brandGlow],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(clip.status != nil && clip.status != "ready")
        }
    }

    private var creditsBadge: some View {
        HStack {
            Image(systemName: "bolt.circle.fill").foregroundStyle(.brand)
            Text("\(credits.balance) credits")
                .fontWeight(.semibold)
            Spacer()
            Button("Buy more") { showPaywall = true }
                .font(.caption)
                .tint(.brand)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 12))
    }

    private func runFaceSwap() async {
        guard faceSwapConsentGivenAt > 0 else { showFaceSwapConsent = true; return }
        guard credits.balance >= 2 else { showPaywall = true; return }
        guard let item = faceImage else { return }
        sending = true
        defer { sending = false }
        do {
            let data = try await item.loadTransferable(type: Data.self)
            guard let data else { error = "Could not load image"; return }
            try await ClipForgeAPI.shared.faceSwap(clipId: clip.id, faceJpeg: data)
            lastResult = "Face swap queued. Check Clips tab in ~30-90 seconds."
            await credits.refresh()
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch let e {
            error = e.localizedDescription
        }
    }

    private func saveToPhotos() async {
        guard let path = clip.storagePath else { return }
        saving = true
        defer { saving = false }
        do {
            let url = try await SignedURLCache.shared.signedURL(
                path: path, bucket: "clipforge-videos-rendered"
            )
            try await SaveToPhotos.saveVideo(from: url)
            lastResult = "Saved to Photos ✓"
            await Haptics.notify(.success)
            ReviewPrompt.markSavedClip()
        } catch let e {
            error = e.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func runTranslation() async {
        let cost = voiceClone ? 5 : 2
        guard credits.balance >= cost else { showPaywall = true; return }
        sending = true
        defer { sending = false }
        do {
            try await ClipForgeAPI.shared.translate(clipId: clip.id, language: selectedLanguage, voiceClone: voiceClone)
            lastResult = "Translation queued. Check Clips tab in ~15-30 seconds."
            await credits.refresh()
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch let e {
            error = e.localizedDescription
        }
    }
}

private func Section_h(_ title: String) -> some View {
    Text(title).font(.title3.bold())
}
