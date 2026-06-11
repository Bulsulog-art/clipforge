import SwiftUI
import PhotosUI

/// Plus-tier custom branding settings. Lets the user upload a logo,
/// pick its corner position, and tune opacity. The worker applies these
/// on every new render (existing clips aren't re-rendered).
@MainActor
struct BrandingSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared

    @State private var branding: ClipForgeAPI.Branding?
    @State private var loading = true
    @State private var lastError: String?

    @State private var pickerItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var position: String = "bottom-right"
    @State private var opacity: Double = 0.85

    private let positions: [(value: String, label: String, icon: String)] = [
        ("top-left",     "Top-Left",     "arrow.up.left"),
        ("top-right",    "Top-Right",    "arrow.up.right"),
        ("bottom-left",  "Bottom-Left",  "arrow.down.left"),
        ("bottom-right", "Bottom-Right", "arrow.down.right"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    headerCard
                    if loading {
                        ProgressView().frame(maxWidth: .infinity).padding(.vertical, 30)
                    } else if !credits.hasPlus {
                        nonPlusCard
                    } else {
                        uploaderCard
                        if branding != nil {
                            positionPicker
                            opacitySlider
                            removeButton
                        }
                    }
                    if let err = lastError {
                        Text(err)
                            .font(.callout).foregroundStyle(.red)
                            .padding(12)
                            .background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                    }
                    footnote
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Custom branding")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await load() }
            .onChange(of: pickerItem) { _, item in
                if let item { Task { await handlePicked(item) } }
            }
        }
    }

    // MARK: - Sections

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Your logo on every clip", systemImage: "checkerboard.shield")
                .font(.caption.weight(.bold))
                .foregroundStyle(.brand)
            Text("Replaces the default ‘Made with ClipForge’ outro on new renders. Upload a transparent PNG for the cleanest look.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var nonPlusCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "lock.fill")
                .font(.system(size: 36))
                .foregroundStyle(.brand)
            Text("Plus feature").font(.headline).foregroundStyle(.textPrimary)
            Text("Custom branding is included with any Plus subscription — weekly, monthly, or yearly.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 26)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    private var uploaderCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let b = branding, let urlStr = b.previewUrl, let url = URL(string: urlStr) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ProgressView().frame(height: 120)
                    case .success(let image):
                        image.resizable().scaledToFit().frame(maxHeight: 120)
                    case .failure:
                        Image(systemName: "photo.fill")
                            .font(.largeTitle).foregroundStyle(.textSecondary)
                            .frame(height: 120)
                    @unknown default:
                        EmptyView()
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(checkerboard)
                .clipShape(.rect(cornerRadius: 12))
            }

            PhotosPicker(selection: $pickerItem, matching: .images) {
                HStack {
                    if uploading {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: branding == nil ? "square.and.arrow.up" : "arrow.triangle.2.circlepath")
                    }
                    Text(uploading
                         ? "Uploading…"
                         : (branding == nil ? "Upload logo" : "Replace logo"))
                        .fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).opacity(0.6)
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
            .disabled(uploading)
        }
    }

    private var checkerboard: some View {
        // 8×8 checker pattern so transparency is obvious in the preview.
        Canvas { ctx, size in
            let step: CGFloat = 12
            let cols = Int(ceil(size.width / step))
            let rows = Int(ceil(size.height / step))
            for r in 0..<rows {
                for c in 0..<cols {
                    if (r + c).isMultiple(of: 2) { continue }
                    let rect = CGRect(
                        x: CGFloat(c) * step, y: CGFloat(r) * step,
                        width: step, height: step
                    )
                    ctx.fill(Path(rect), with: .color(.gray.opacity(0.18)))
                }
            }
        }
    }

    private var positionPicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Position")
                .font(.caption.weight(.bold))
                .foregroundStyle(.textSecondary)
                .tracking(0.8)
                .textCase(.uppercase)
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(positions, id: \.value) { p in
                    Button {
                        position = p.value
                        Task { await persistMeta() }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: p.icon)
                            Text(p.label).font(.callout.weight(.semibold))
                            Spacer()
                            if position == p.value {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(.brand)
                            }
                        }
                        .padding(10)
                        .background(position == p.value ? Color.brand.opacity(0.18) : Color.cardBackground)
                        .clipShape(.rect(cornerRadius: 10))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var opacitySlider: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Opacity")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.textSecondary)
                    .tracking(0.8)
                    .textCase(.uppercase)
                Spacer()
                Text(String(format: "%d%%", Int(opacity * 100)))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.textSecondary)
            }
            Slider(value: $opacity, in: 0.10...1.00, step: 0.05) { editing in
                if !editing { Task { await persistMeta() } }
            }
            .tint(.brand)
        }
    }

    private var removeButton: some View {
        Button(role: .destructive) {
            Task { await remove() }
        } label: {
            HStack {
                Image(systemName: "trash")
                Text("Remove branding").fontWeight(.semibold)
                Spacer()
            }
            .padding()
            .background(Color.cardBackground)
            .foregroundStyle(.red)
            .clipShape(.rect(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private var footnote: some View {
        Text("Applied to new renders only — existing clips aren't re-rendered. PNG / JPEG / WebP up to 2 MB.")
            .font(.caption2)
            .foregroundStyle(Color.textSecondary.opacity(0.6))
    }

    // MARK: - Behaviour

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            branding = try await ClipForgeAPI.shared.fetchBranding()
            if let b = branding {
                position = b.position
                opacity = b.opacity
            }
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func handlePicked(_ item: PhotosPickerItem) async {
        uploading = true
        lastError = nil
        defer { uploading = false; pickerItem = nil }
        do {
            guard let data = try await item.loadTransferable(type: Data.self), !data.isEmpty else {
                lastError = "Couldn't read that image."
                return
            }
            // We send PNG by default (preserves transparency); PhotosPicker
            // returns the original-format bytes so we set the mime from the
            // first magic bytes to keep server-side checks happy.
            let mime: String = data.starts(with: [0xFF, 0xD8]) ? "image/jpeg" :
                               data.starts(with: [0x52, 0x49, 0x46, 0x46]) ? "image/webp" :
                               "image/png"
            try await ClipForgeAPI.shared.uploadBrandingLogo(imageData: data, mimeType: mime)
            await Haptics.notify(.success)
            await load()
        } catch ClipForgeAPI.Error.quotaExceeded {
            lastError = "Custom branding is a Plus feature. Subscribe to unlock."
        } catch {
            lastError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func persistMeta() async {
        do {
            try await ClipForgeAPI.shared.updateBranding(position: position, opacity: opacity)
            await Haptics.impact(.light)
        } catch {
            lastError = error.localizedDescription
        }
    }

    private func remove() async {
        do {
            try await ClipForgeAPI.shared.removeBranding()
            branding = nil
            await Haptics.notify(.success)
        } catch {
            lastError = error.localizedDescription
        }
    }
}
