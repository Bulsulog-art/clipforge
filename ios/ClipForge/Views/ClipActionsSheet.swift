import SwiftUI
import PhotosUI

struct ClipActionsSheet: View {
    let clip: Clip
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var faceImage: PhotosPickerItem?
    @State private var selectedLanguage = "en"
    @State private var voiceClone = false
    @State private var sending = false
    @State private var lastResult: String?
    @State private var error: String?
    @State private var showPaywall = false
    @State private var saving = false

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
                            Task { await runFaceSwap() }
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
            .background(Color.appBackground.ignoresSafeArea())
            .task { await credits.refresh() }
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
            let url = try await ClipForgeAPI.shared.signedURL(
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
