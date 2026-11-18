import SwiftUI
import UIKit
import PhotosUI
import AVFoundation
import DentVideoCore

/// "See it with your logo": right after a new clinic's form (and from the plans), the web's live
/// preview on the phone. The samples are the web's static, already-reviewed library
/// (GET mobile/v1/preview); each plays as a story in a phone-shaped frame, painted in the clinic's
/// colour, with its logo in the corner and its name, the same overlay the web draws over the
/// samples. Picking a logo shows it at once, then saves it to the clinic (POST mobile/v1/logo);
/// a colour is saved like the settings form. Nothing is generated; no paid call is made.
struct LogoPreviewView: View {
    /// The bottom button: "See the plans" (or "Continue"), then the next step.
    let continueLabel: String
    var closable = false
    let onContinue: () -> Void
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var preview = LogoPreviewModel()
    @State private var picked: PhotosPickerItem?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.s5) {
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text(L("preview.title"))
                            .font(Theme.display(.largeTitle))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader)
                            .accessibilityIdentifier("preview.title")
                        Text(L("preview.lead"))
                            .font(.body)
                            .foregroundStyle(Theme.body)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    stage
                    logoRow
                    colorRow
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.vertical, Theme.s5)
                .readableWidth(560)
            }
            .background(Theme.paper.ignoresSafeArea())
            .safeAreaInset(edge: .bottom, spacing: 0) {
                Button {
                    preview.stop()
                    onContinue()
                } label: {
                    Label(continueLabel, systemImage: "arrow.forward")
                }
                .buttonStyle(.dvPrimary)
                .accessibilityIdentifier("preview.continue")
                .padding(.horizontal, Theme.gutter)
                .padding(.top, Theme.s3)
                .padding(.bottom, Theme.s2)
                .readableWidth(560)
                .background(.bar)
                .overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 0.5) }
            }
            .toolbar {
                if closable {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(L("common.close")) { preview.stop(); dismiss() }.accessibilityIdentifier("preview.close")
                    }
                }
            }
        }
        .task {
            preview.attach(model)
            // Autoplay muted, as the web does; never with Reduce Motion, nor in demo mode (screenshots
            // and UI tests drive it by hand).
            await preview.load(autoplay: !reduceMotion && !model.isDemoMode)
            #if DEBUG
            if model.isDemo("preview", "preview-failed") {
                preview.showScene(.list)
                await preview.use(Demo.sampleLogo())
            }
            #endif
        }
        .onDisappear { preview.stop() }
        .onChange(of: picked) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    await preview.use(data)
                } else {
                    preview.saving = .failed(L("preview.logo.unreadable"))
                }
                picked = nil
            }
        }
    }

    // MARK: Stage

    private var stage: some View {
        VStack(spacing: Theme.s3) {
            PreviewStage(preview: preview)
                .frame(maxWidth: 300)
                .frame(maxWidth: .infinity)
            if preview.phase == .ready, preview.samples.count > 0 {
                HStack(spacing: Theme.s2) {
                    if preview.samples.count > 1 {
                        Button { preview.step(-1) } label: {
                            Image(systemName: "chevron.backward").frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(L("preview.previous"))
                        .accessibilityIdentifier("preview.previous")
                    }
                    VStack(spacing: 2) {
                        if let s = preview.sample {
                            Text(s.title)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Theme.ink)
                                .multilineTextAlignment(.center)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        Text(L("preview.sample", preview.index + 1, preview.samples.count))
                            .font(.footnote)
                            .foregroundStyle(Theme.muted)
                            .monospacedDigit()
                    }
                    .frame(maxWidth: .infinity)
                    .accessibilityElement(children: .combine)
                    .accessibilityIdentifier("preview.sample")
                    if preview.samples.count > 1 {
                        Button { preview.step(1) } label: {
                            Image(systemName: "chevron.forward").frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(L("preview.next"))
                        .accessibilityIdentifier("preview.next")
                    }
                }
                .tint(Theme.teal)
                .font(.headline)
                if let missing = preview.info?.servicesWithoutSample, !missing.isEmpty {
                    Text(L("preview.noSample", missing.joined(separator: ", ")))
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    // MARK: Logo

    private var logoRow: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            HStack(spacing: Theme.s4) {
                LogoChip(logo: preview.logo, name: preview.clinicName, color: preview.color, size: 64)
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: Theme.s2) {
                    pickButton
                    Text(L("preview.logo.hint"))
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            saveStatus
        }
        .padding(Theme.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .dvCard()
    }

    @ViewBuilder private var pickButton: some View {
        #if DEBUG
        if model.isDemoMode {
            // Demo mode has no photo library to pick from: the sample logo stands in for the picker.
            Button { Task { await preview.use(Demo.sampleLogo()) } } label: { pickLabel }
                .buttonStyle(.dvSecondary)
                .accessibilityIdentifier("preview.logo.pick")
        } else {
            picker
        }
        #else
        picker
        #endif
    }

    private var pickTitle: String { preview.logo == nil ? L("preview.logo.choose") : L("preview.logo.change") }

    private var pickLabel: some View { Label(pickTitle, systemImage: "photo.badge.plus") }

    private var picker: some View {
        let title = pickTitle
        return PhotosPicker(selection: $picked, matching: .images) { Label(title, systemImage: "photo.badge.plus") }
            .buttonStyle(.dvSecondary)
            .accessibilityIdentifier("preview.logo.pick")
    }

    @ViewBuilder private var saveStatus: some View {
        switch preview.saving {
        case .idle:
            EmptyView()
        case .uploading:
            HStack(spacing: Theme.s2) {
                ProgressView()
                Text(L("preview.logo.saving")).font(.subheadline).foregroundStyle(Theme.body)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("preview.logo.saving")
        case .saved:
            Label(L("preview.logo.saved"), systemImage: "checkmark.circle.fill")
                .font(.subheadline)
                .foregroundStyle(Theme.teal)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityIdentifier("preview.logo.saved")
        case let .failed(text):
            VStack(alignment: .leading, spacing: Theme.s2) {
                ErrorBox(text: text, id: "preview.logo.error")
                if preview.canRetryUpload {
                    Button(L("common.retry")) { Task { await preview.retryUpload() } }
                        .buttonStyle(.dvQuiet)
                        .accessibilityIdentifier("preview.logo.retry")
                }
            }
        }
    }

    // MARK: Colour

    private var colorRow: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            Text(L("preview.color"))
                .font(.headline)
                .foregroundStyle(Theme.ink)
                .accessibilityAddTraits(.isHeader)
            FlowLayout(spacing: Theme.s2) {
                if let fromLogo = preview.fromLogo {
                    Swatch(hex: fromLogo, selected: preview.color == fromLogo, label: L("preview.color.fromLogo"), showsLabel: true) { preview.choose(fromLogo) }
                        .accessibilityIdentifier("preview.swatch.logo")
                }
                ForEach(Array(PreviewLook.swatches.enumerated()), id: \.element) { n, hex in
                    Swatch(hex: hex, selected: preview.color == hex, label: L("preview.color.option", n + 1)) { preview.choose(hex) }
                        .accessibilityIdentifier("preview.swatch.\(n)")
                }
                ColorPicker(L("preview.color.custom"), selection: Binding(
                    get: { Color(rgb: PreviewLook.parse(preview.color) ?? RGB(0.06, 0.36, 0.36)) },
                    set: { if let hex = ClinicSetupView.hex($0) { preview.choose(hex) } }
                ), supportsOpacity: false)
                .labelsHidden()
                .frame(width: 44, height: 44)
                .accessibilityLabel(L("preview.color.custom"))
            }
            if let error = preview.colorError {
                Text(error).font(.footnote).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("preview.color.error")
            }
        }
        .padding(Theme.s4)
        .frame(maxWidth: .infinity, alignment: .leading)
        .dvCard()
    }
}

/// A colour to choose: a 36 pt dot in a 44 pt target, a ring when chosen.
struct Swatch: View {
    let hex: String
    let selected: Bool
    let label: String
    var showsLabel = false
    let action: () -> Void

    var body: some View {
        let rgb = PreviewLook.parse(hex) ?? RGB(0, 0, 0)
        Button(action: action) {
            HStack(spacing: Theme.s2) {
                Circle()
                    .fill(Color(rgb: rgb))
                    .frame(width: 32, height: 32)
                    .overlay {
                        if selected {
                            Image(systemName: "checkmark")
                                .font(.footnote.weight(.bold))
                                .foregroundStyle(PreviewLook.prefersDarkText(on: rgb) ? Color.black : Color.white)
                        }
                    }
                    .padding(3)
                    .overlay(Circle().strokeBorder(selected ? Theme.ink : Theme.line, lineWidth: selected ? 2 : 1))
                if showsLabel {
                    Text(label).font(.subheadline.weight(.medium)).foregroundStyle(Theme.ink)
                }
            }
            .padding(.trailing, showsLabel ? Theme.s3 : 0)
            .frame(minWidth: 44, minHeight: 44)
            .background(showsLabel ? Theme.sand : Color.clear, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// The clinic's logo on a white chip, as in the videos' corner; its initials in its colour until
/// there is a logo.
struct LogoChip: View {
    let logo: UIImage?
    let name: String
    let color: String
    var size: CGFloat = 44

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.24, style: .continuous)
            .fill(Color.white)
            .frame(width: size, height: size)
            .overlay {
                if let logo {
                    Image(uiImage: logo)
                        .resizable()
                        .scaledToFit()
                        .padding(size * 0.12)
                } else {
                    Text(verbatim: Self.initials(name))
                        .font(.system(size: size * 0.38, weight: .bold, design: .serif))
                        .foregroundStyle(Color(rgb: PreviewLook.parse(color) ?? RGB(0.06, 0.36, 0.36)))
                        .minimumScaleFactor(0.5)
                }
            }
            .shadow(color: .black.opacity(0.18), radius: size * 0.12, y: size * 0.04)
    }

    static func initials(_ name: String) -> String {
        let words = name.split(whereSeparator: { $0.isWhitespace }).prefix(2)
        let s = words.compactMap { $0.first.map(String.init) }.joined()
        return s.isEmpty ? "DV" : s.uppercased()
    }
}

extension Color {
    init(rgb: RGB) { self.init(red: rgb.r, green: rgb.g, blue: rgb.b) }
}

// MARK: - Stage

/// The phone-shaped "video": the sample's scenes in turn over the clinic's colour, its logo in the
/// top corner of the video's own direction (right; left in an Arabic video), the play and sound
/// buttons in the other, the clinic's name at the bottom, and a story bar per sample.
struct PreviewStage: View {
    let preview: LogoPreviewModel
    @Environment(\.layoutDirection) private var pageDirection
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var glow = 0.0

    var body: some View {
        let base = PreviewLook.parse(preview.color) ?? RGB(0.06, 0.36, 0.36)
        let dark = PreviewLook.prefersDarkText(on: base)
        let ink: Color = dark ? Color(red: 0.08, green: 0.13, blue: 0.12) : .white
        GeometryReader { geo in
            let u = geo.size.width / 300
            ZStack {
                LinearGradient(colors: [Color(rgb: base), Color(rgb: PreviewLook.deeper(base, by: 0.5))], startPoint: .top, endPoint: .bottom)
                Circle().fill(.white.opacity(0.08)).frame(width: 260 * u).offset(x: 110 * u, y: -170 * u)
                Circle().fill(.white.opacity(0.06)).frame(width: 200 * u).offset(x: -120 * u, y: 230 * u)
                content(u: u, ink: ink, base: base)
                chrome(u: u, ink: ink)
            }
            .environment(\.layoutDirection, preview.videoRightToLeft ? .rightToLeft : .leftToRight)
        }
        .aspectRatio(9 / 16, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 34, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 34, style: .continuous).strokeBorder(Color.black.opacity(0.12), lineWidth: 1))
        .background {
            // A soft ring in the new colour when the look changes: the "that's mine" moment.
            RoundedRectangle(cornerRadius: 40, style: .continuous)
                .stroke(Color(rgb: base), lineWidth: 3)
                .shadow(color: Color(rgb: base), radius: 18)
                .padding(-6)
                .opacity(glow)
        }
        .shadow(color: .black.opacity(0.18), radius: 22, y: 12)
        .contentShape(Rectangle())
        .onTapGesture { preview.toggle() }
        // Simultaneous, so a vertical drag over the stage still scrolls the page.
        .simultaneousGesture(
            DragGesture(minimumDistance: 30).onEnded { v in
                guard abs(v.translation.width) > abs(v.translation.height) else { return }
                // On a right-to-left page the next sample lies to the left.
                let forward = (v.translation.width < 0) != (pageDirection == .rightToLeft)
                preview.step(forward ? 1 : -1)
            }
        )
        .onChange(of: preview.lookChanges) { _, _ in
            guard !reduceMotion else { return }
            glow = 0.9
            withAnimation(.easeOut(duration: 1.1)) { glow = 0 }
        }
    }

    @ViewBuilder private func content(u: CGFloat, ink: Color, base: RGB) -> some View {
        switch preview.phase {
        case .loading:
            VStack(spacing: 10 * u) {
                ProgressView().tint(ink)
                Text(L("preview.loading")).font(.system(size: 13 * u, weight: .medium)).foregroundStyle(ink.opacity(0.8))
            }
            .accessibilityElement(children: .combine)
        case .failed:
            VStack(spacing: 14 * u) {
                Text(L("preview.failed"))
                    .font(.system(size: 15 * u, weight: .semibold))
                    .foregroundStyle(ink)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("preview.failed")
                Button(L("common.retry")) { Task { await preview.load(autoplay: false) } }
                    .font(.system(size: 15 * u, weight: .semibold))
                    .foregroundStyle(Color(rgb: base))
                    .padding(.horizontal, 18 * u)
                    .frame(minHeight: 44)
                    .background(Color.white, in: Capsule())
                    .accessibilityIdentifier("preview.retry")
            }
            .padding(24 * u)
        case .ready:
            if let plan = preview.plan, let at = plan.scene(at: preview.time) {
                SceneView(scene: plan.scenes[at.index], progress: preview.playing ? at.progress : 1, u: u, ink: ink, base: base)
                    .id("\(preview.sample?.id ?? "")-\(at.index)")
                    .transition(reduceMotion ? .opacity : .opacity.combined(with: .scale(scale: 0.97)))
                    .animation(reduceMotion ? nil : .easeInOut(duration: 0.35), value: at.index)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(L("preview.player", preview.sample?.title ?? plan.title))
                    .accessibilityValue(plan.scenes[at.index].texts.joined(separator: ". "))
                    .accessibilityIdentifier("preview.stage")
            }
        }
    }

    private func chrome(u: CGFloat, ink: Color) -> some View {
        VStack(spacing: 0) {
            // Story progress: one segment per sample.
            if preview.samples.count > 1 {
                HStack(spacing: 4 * u) {
                    ForEach(Array(preview.samples.enumerated()), id: \.element.id) { n, _ in
                        GeometryReader { g in
                            Capsule().fill(ink.opacity(0.3))
                                .overlay(alignment: .leading) {
                                    Capsule().fill(ink).frame(width: g.size.width * preview.storyFill(n))
                                }
                        }
                        .frame(height: 3 * u)
                    }
                }
                .padding(.horizontal, 16 * u)
                .padding(.top, 14 * u)
                .accessibilityHidden(true)
            }
            HStack(alignment: .top) {
                // Controls on the side the logo is not on (the web's previewControlsSide).
                HStack(spacing: 8 * u) {
                    if preview.sample?.audioPath != nil {
                        roundButton(preview.muted ? "speaker.slash.fill" : "speaker.wave.2.fill", label: preview.muted ? L("preview.unmute") : L("preview.mute"), id: "preview.mute", u: u, ink: ink) { preview.toggleMute() }
                    }
                    roundButton(preview.playing ? "pause.fill" : "play.fill", label: preview.playing ? L("preview.pause") : L("preview.play"), id: "preview.play", u: u, ink: ink) { preview.toggle() }
                }
                Spacer()
                LogoChip(logo: preview.logo, name: preview.clinicName, color: preview.color, size: 46 * u)
                    .accessibilityElement()
                    .accessibilityLabel(L("preview.logo.label"))
                    .accessibilityIdentifier(preview.logo == nil ? "preview.chip.initials" : "preview.chip.logo")
            }
            .padding(.horizontal, 14 * u)
            .padding(.top, 12 * u)
            Spacer()
            VStack(spacing: 4 * u) {
                Text(preview.clinicName)
                    .font(.system(size: 12 * u, weight: .semibold))
                    .foregroundStyle(ink.opacity(0.9))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                if let d = preview.plan?.disclaimer, !d.isEmpty {
                    Text(d)
                        .font(.system(size: 8 * u))
                        .foregroundStyle(ink.opacity(0.75))
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                }
            }
            .padding(.horizontal, 18 * u)
            .padding(.bottom, 16 * u)
            .accessibilityElement(children: .combine)
        }
    }

    private func roundButton(_ symbol: String, label: String, id: String, u: CGFloat, ink: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14 * u, weight: .semibold))
                .foregroundStyle(ink)
                .frame(width: 36 * u, height: 36 * u)
                .background(ink.opacity(0.16), in: Circle())
                .overlay(Circle().strokeBorder(ink.opacity(0.25)))
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(id)
    }
}

/// One scene, drawn the way the videos lay them out: a big hook, a statement with its key words
/// marked, a list that builds, two sides compared, a number, and the closing call with the handle.
struct SceneView: View {
    let scene: PreviewScene
    /// 0...1 through the scene (1 while paused: everything shown).
    let progress: Double
    let u: CGFloat
    let ink: Color
    let base: RGB

    var body: some View {
        VStack(alignment: .leading, spacing: 14 * u) {
            switch scene.kind {
            case .hook:
                text(scene.text, size: 30, weight: .heavy)
                if let sub = scene.sub { text(sub, size: 16, weight: .medium).opacity(0.85) }
            case .statement:
                marked(scene.text ?? "", scene.emphasis)
                    .font(.system(size: 24 * u, weight: .bold))
                    .foregroundStyle(ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .minimumScaleFactor(0.5)
            case .footage:
                text(scene.caption, size: 22, weight: .bold)
                    .padding(16 * u)
                    .background(ink.opacity(0.12), in: RoundedRectangle(cornerRadius: 18 * u, style: .continuous))
            case .list:
                text(scene.heading, size: 24, weight: .heavy)
                ForEach(Array(scene.items.enumerated()), id: \.offset) { n, item in
                    HStack(alignment: .top, spacing: 10 * u) {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 18 * u, weight: .bold))
                        text(item, size: 17, weight: .semibold)
                    }
                    .foregroundStyle(ink)
                    .opacity(progress >= Double(n) * 0.2 ? 1 : 0)
                    .offset(y: progress >= Double(n) * 0.2 ? 0 : 8 * u)
                }
            case .compare:
                if let l = scene.left { side(l, symbol: "xmark.circle.fill") }
                if let r = scene.right { side(r, symbol: "checkmark.circle.fill") }
            case .stat:
                Text(scene.value ?? "")
                    .font(.system(size: 96 * u, weight: .heavy, design: .rounded))
                    .foregroundStyle(ink)
                    .minimumScaleFactor(0.4)
                    .lineLimit(1)
                text(scene.label, size: 22, weight: .bold)
                if let c = scene.context { text(c, size: 16, weight: .medium).opacity(0.85) }
            case .cta:
                text(scene.text, size: 26, weight: .heavy)
                if let h = scene.handle {
                    Text(h)
                        .font(.system(size: 16 * u, weight: .bold))
                        .foregroundStyle(Color(rgb: PreviewLook.prefersDarkText(on: base) ? PreviewLook.deeper(base, by: 0.6) : base))
                        .padding(.horizontal, 14 * u)
                        .padding(.vertical, 8 * u)
                        .background(Color.white, in: Capsule())
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
            case .unknown:
                EmptyView()
            }
        }
        .padding(.horizontal, 24 * u)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .animation(.easeOut(duration: 0.3), value: progress >= 0.2)
        .animation(.easeOut(duration: 0.3), value: progress >= 0.4)
    }

    private func text(_ s: String?, size: CGFloat, weight: Font.Weight) -> some View {
        Text(s ?? "")
            .font(.system(size: size * u, weight: weight))
            .foregroundStyle(ink)
            .fixedSize(horizontal: false, vertical: true)
            .minimumScaleFactor(0.5)
    }

    private func side(_ s: PreviewScene.Side, symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6 * u) {
            Label(s.label, systemImage: symbol).font(.system(size: 15 * u, weight: .heavy))
            text(s.text, size: 18, weight: .semibold)
        }
        .foregroundStyle(ink)
        .padding(14 * u)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(ink.opacity(0.12), in: RoundedRectangle(cornerRadius: 16 * u, style: .continuous))
    }

    /// The statement with its first emphasis phrase underlined.
    private func marked(_ s: String, _ emphasis: [String]) -> Text {
        guard let e = emphasis.first(where: { !$0.isEmpty }), let r = s.range(of: e) else { return Text(s) }
        return Text(s[..<r.lowerBound]) + Text(s[r]).underline(true, color: ink.opacity(0.7)) + Text(s[r.upperBound...])
    }
}

// MARK: - Model

/// The preview's state: the samples and their plans, the clinic's look, the logo upload, and the
/// story playback (a clock; the narration plays along when the sample has one).
@MainActor
@Observable
final class LogoPreviewModel {
    enum Phase: Equatable { case loading, ready, failed }
    enum Saving: Equatable { case idle, uploading, saved, failed(String) }

    var phase: Phase = .loading
    var info: PreviewInfo?
    /// Samples whose plan has loaded, in the server's order.
    var samples: [PreviewInfo.Sample] = []
    var index = 0
    /// Seconds into the current sample.
    var time: Double = 0
    var playing = false
    var muted = true
    var logo: UIImage?
    var saving: Saving = .idle
    /// "0F5C5C".
    var color = PreviewLook.defaultColor
    /// The logo's own colour, offered first.
    var fromLogo: String?
    var colorError: String?
    /// Bumped when the colour or logo changes (the stage's glow).
    var lookChanges = 0

    @ObservationIgnored private var app: AppModel?
    @ObservationIgnored private var plans: [String: PreviewPlan] = [:]
    @ObservationIgnored private var pending: PreparedLogo?
    @ObservationIgnored private var hadColor = false
    @ObservationIgnored private var ticker: Task<Void, Never>?
    @ObservationIgnored private var colorSave: Task<Void, Never>?
    @ObservationIgnored private var audio: AVPlayer?
    @ObservationIgnored private var audioID: String?

    var sample: PreviewInfo.Sample? { samples.indices.contains(index) ? samples[index] : nil }
    var clinicName: String { info?.clinic.name ?? app?.me?.clinic?.profile.name ?? "" }
    var videoRightToLeft: Bool { info?.isRightToLeft ?? false }
    var canRetryUpload: Bool { pending != nil }

    /// The current sample's plan, with the clinic's name and handle filled in.
    var plan: PreviewPlan? {
        guard let s = sample, let p = plans[s.id] else { return nil }
        return p.personalised(name: clinicName, handle: info?.clinic.handle ?? app?.me?.clinic?.profile.handle)
    }

    /// The story bar of sample `n`: full before the current one, filling for it, empty after.
    func storyFill(_ n: Int) -> Double {
        if n < index { return 1 }
        if n > index { return 0 }
        guard let d = plan?.duration, d > 0 else { return 0 }
        return min(1, time / d)
    }

    func attach(_ app: AppModel) { self.app = app }

    func load(autoplay: Bool) async {
        guard let app else { return }
        phase = .loading
        do {
            let p = try await app.api.preview()
            info = p
            if let c = PreviewLook.parse(p.clinic.brandColor ?? app.me?.clinic?.profile.brandColor) {
                color = PreviewLook.hex(c)
                hadColor = true
            }
            if logo == nil, let u = p.clinic.logoUrl { Task { await self.fetchLogo(u) } }
            var loaded: [PreviewInfo.Sample] = []
            for s in p.samples {
                if plans[s.id] == nil, let plan = try? await app.api.previewPlan(path: s.planPath), !plan.scenes.isEmpty { plans[s.id] = plan }
                if plans[s.id] != nil {
                    loaded.append(s)
                    // The first one plays as soon as it is here; the others follow.
                    if loaded.count == 1 {
                        samples = loaded
                        index = 0
                        time = 0
                        phase = .ready
                        if autoplay { play() }
                    }
                }
            }
            samples = loaded
            if loaded.isEmpty { phase = .failed }
        } catch {
            if case APIError.unauthorized? = error as? APIError { app.handle(error) }
            phase = .failed
        }
    }

    private func fetchLogo(_ url: URL) async {
        guard let answer = try? await URLSession.shared.data(from: url), logo == nil, let img = UIImage(data: answer.0) else { return }
        logo = img
        if let hex = PreparedLogo.suggestedColor(img) { fromLogo = hex }
    }

    // MARK: Playback

    func play() {
        guard phase == .ready, sample != nil else { return }
        if let d = plan?.duration, time >= d { time = 0 }
        playing = true
        startAudio()
        ticker?.cancel()
        ticker = Task { [weak self] in
            var last = Date()
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
                guard let self, self.playing else { return }
                let now = Date()
                self.time += now.timeIntervalSince(last)
                last = now
                if let d = self.plan?.duration, self.time >= d { self.advance(1) }
            }
        }
    }

    func pause() {
        playing = false
        ticker?.cancel()
        ticker = nil
        audio?.pause()
    }

    func toggle() { playing ? pause() : play() }

    func stop() {
        pause()
        audio = nil
        audioID = nil
        colorSave?.cancel()
    }

    func toggleMute() {
        muted.toggle()
        audio?.isMuted = muted
        // Sound on is a request to hear it.
        if !muted {
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            if !playing { play() }
        }
    }

    /// The next or previous sample (wraps round).
    func step(_ d: Int) {
        guard samples.count > 1 else { return }
        advance(d)
    }

    private func advance(_ d: Int) {
        let n = max(samples.count, 1)
        index = ((index + d) % n + n) % n
        time = 0
        if playing { startAudio() } else { audio?.pause() }
    }

    /// Demo screenshots: hold on the first scene of this kind, fully drawn.
    func showScene(_ kind: PreviewScene.Kind) {
        guard let p = plan else { return }
        var t = 0.0
        for s in p.scenes {
            if s.kind == kind { time = t + 0.01; return }
            t += s.seconds
        }
    }

    private func startAudio() {
        guard let app, let s = sample, let url = app.api.previewAudioURL(s.audioPath) else {
            audio?.pause()
            return
        }
        if audioID != s.id {
            audio = AVPlayer(url: url)
            audioID = s.id
        }
        if muted { try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default) }
        audio?.isMuted = muted
        audio?.seek(to: CMTime(seconds: time, preferredTimescale: 600))
        audio?.play()
    }

    // MARK: Look

    /// A colour chosen: the preview repaints now, the clinic's profile is saved a moment later.
    func choose(_ hex: String) {
        guard hex != color || !hadColor else { return }
        color = hex
        hadColor = true
        lookChanges += 1
        colorError = nil
        colorSave?.cancel()
        colorSave = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(600))
            guard let self, !Task.isCancelled else { return }
            await self.saveColor(hex)
        }
    }

    private func saveColor(_ hex: String) async {
        guard let app, let profile = app.me?.clinic?.profile else { return }
        do {
            let saved = try await app.api.saveBrandColor(hex, profile: profile)
            app.applyLook(brandColor: saved.brandColor, logoUrl: nil)
        } catch {
            if case APIError.unauthorized? = error as? APIError { app.handle(error); return }
            colorError = L("preview.color.failed")
        }
    }

    /// A logo picked (or the demo's): shown at once, its colour offered (and used when the clinic
    /// has none yet, as the web does), then saved to the clinic.
    func use(_ data: Data) async {
        guard let prepared = PreparedLogo(data) else {
            saving = .failed(L("preview.logo.unreadable"))
            return
        }
        logo = prepared.image
        lookChanges += 1
        if let hex = PreparedLogo.suggestedColor(prepared.image) {
            fromLogo = hex
            if !hadColor { choose(hex) }
        }
        pending = prepared
        await upload()
    }

    func retryUpload() async { await upload() }

    private func upload() async {
        guard let app, let p = pending else { return }
        saving = .uploading
        do {
            let up = try await app.api.uploadLogo(p.data, contentType: p.contentType)
            pending = nil
            saving = .saved
            app.applyLook(brandColor: nil, logoUrl: up.logoUrl)
            UIAccessibility.post(notification: .announcement, argument: L("preview.logo.saved"))
        } catch {
            if case APIError.unauthorized? = error as? APIError { app.handle(error); return }
            var text = L("preview.logo.failed")
            // The server's own sentence when it refused the file (too large, not an image).
            if case let APIError.refused(_, sentence)? = error as? APIError, let sentence { text = sentence }
            saving = .failed(text)
            UIAccessibility.post(notification: .announcement, argument: text)
        }
    }
}

/// A picked image made ready to send: at most 1024 px on its longest side, PNG (keeps a transparent
/// background) or JPEG when the PNG would pass the server's 5 MB.
struct PreparedLogo {
    let image: UIImage
    let data: Data
    let contentType: String

    init?(_ raw: Data) {
        guard let source = UIImage(data: raw), source.size.width > 0, source.size.height > 0 else { return nil }
        let longest = max(source.size.width * source.scale, source.size.height * source.scale)
        let k = min(1, 1024 / longest)
        let size = CGSize(width: max(1, (source.size.width * source.scale * k).rounded()), height: max(1, (source.size.height * source.scale * k).rounded()))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = false
        let image = UIGraphicsImageRenderer(size: size, format: format).image { _ in source.draw(in: CGRect(origin: .zero, size: size)) }
        if let png = image.pngData(), png.count <= 4_800_000 {
            self.image = image
            self.data = png
            self.contentType = "image/png"
        } else if let jpg = image.jpegData(compressionQuality: 0.88) {
            self.image = image
            self.data = jpg
            self.contentType = "image/jpeg"
        } else {
            return nil
        }
    }

    /// The logo's own colour (Core's PreviewLook.suggest over a 32 × 32 copy), or nil.
    static func suggestedColor(_ image: UIImage) -> String? {
        guard let cg = image.cgImage else { return nil }
        let side = 32
        var px = [UInt8](repeating: 0, count: side * side * 4)
        let drawn: Bool = px.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(data: buf.baseAddress, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
                                      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.interpolationQuality = .medium
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: side, height: side))
            return true
        }
        guard drawn else { return nil }
        // Un-premultiply, so a soft edge does not read darker than the colour it is.
        for i in stride(from: 0, to: px.count, by: 4) where px[i + 3] > 0 && px[i + 3] < 255 {
            let a = Double(px[i + 3])
            for c in 0..<3 { px[i + c] = UInt8(min(255, (Double(px[i + c]) * 255 / a).rounded())) }
        }
        return PreviewLook.suggest(rgba: px, width: side, height: side)
    }
}

#Preview {
    LogoPreviewView(continueLabel: "See the plans") {}.environment(AppModel.preview())
}
