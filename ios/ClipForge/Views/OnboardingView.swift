import SwiftUI

/// First-launch onboarding. 4 spring-animated stages with custom illustrations
/// per stage — not generic icons. Each stage's visual triggers on appear so
/// users see motion every time they swipe forward, reinforcing "this app is
/// alive". Final stage asks for push permission (soft ask).
struct OnboardingView: View {
    let onComplete: () -> Void

    @State private var page = 0
    @State private var requestingPush = false
    @State private var bgPhase: Double = 0  // drives the subtle background gradient drift
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let pages: [Page] = [
        Page(
            kind: .splitClips,
            title: "Long video.\n100+ viral clips.",
            body: "Drop a YouTube link or your podcast — ClipForge finds the moments worth sharing and edits them with TikTok-style captions, automatically.",
            highlight: "AI does the editing",
            isPushAsk: false
        ),
        Page(
            kind: .faceSwap,
            title: "Face Swap.\nTranslate.\nGo viral.",
            body: "Swap any face in 30 seconds (SwapTok-grade). Translate captions to 15+ languages. AI avatars that speak your script in 6 voices.",
            highlight: "Klap + HeyGen + Reface in one",
            isPushAsk: false
        ),
        Page(
            kind: .pricingStack,
            title: "One free taste,\nthen Plus.",
            body: "1 free clip set on signup. After that: Plus weekly $5.99, monthly $14.99, or yearly $59.99 (500 credits — best value).",
            highlight: "Cancel anytime · refund-safe",
            isPushAsk: false
        ),
        Page(
            kind: .pushBanner,
            title: "Get notified\nwhen clips drop.",
            body: "Renders take 60–120 seconds. We'll ping you the moment your viral set is ready, plus a heads-up when credits run low.",
            highlight: "Only render alerts · no spam",
            isPushAsk: true
        ),
    ]

    var body: some View {
        ZStack(alignment: .top) {
            animatedBackground
            VStack(spacing: 0) {
                topBar
                TabView(selection: $page) {
                    ForEach(pages.indices, id: \.self) { i in
                        slide(pages[i], index: i).tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.spring(duration: 0.5), value: page)

                pageIndicator
                    .padding(.top, 4)

                primaryButton
                    .padding(.top, 18)
                    .padding(.horizontal, 32)

                if pages[page].isPushAsk {
                    Button("Maybe later") {
                        Task { await Haptics.impact(.light) }
                        markPushAskHandled()
                        finish()
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
                }
            }
            .padding(.bottom, 22)
        }
        .onAppear {
            // Respect Reduce Motion — the 14s background drift is a
            // continuous looping animation, the vestibular-trigger flavour
            // Apple specifically calls out. Leave the gradient at its
            // starting palette for those users.
            guard !reduceMotion else { return }
            withAnimation(.linear(duration: 14).repeatForever(autoreverses: true)) {
                bgPhase = 1
            }
        }
    }

    // MARK: - Chrome

    private var animatedBackground: some View {
        LinearGradient(
            colors: bgPhase < 0.5
                ? [Color.appBackground, Color.brand.opacity(0.22), Color.purple.opacity(0.18)]
                : [Color.appBackground, Color.purple.opacity(0.22), Color.brand.opacity(0.18)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var topBar: some View {
        HStack {
            Spacer()
            if !pages[page].isPushAsk {
                Button("Skip") {
                    Task { await Haptics.impact(.light) }
                    finish()
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.trailing, 18)
                .padding(.top, 10)
            }
        }
    }

    private var pageIndicator: some View {
        HStack(spacing: 8) {
            ForEach(pages.indices, id: \.self) { i in
                Capsule()
                    .fill(i == page ? Color.brand : Color.white.opacity(0.25))
                    .frame(width: i == page ? 24 : 8, height: 8)
                    .animation(.spring, value: page)
            }
        }
    }

    @ViewBuilder
    private var primaryButton: some View {
        let isPushAsk = pages[page].isPushAsk
        let isLast = page == pages.count - 1
        Button {
            Task { await advance(isPushAsk: isPushAsk, isLast: isLast) }
        } label: {
            HStack {
                if requestingPush { ProgressView().tint(.white) }
                Text(buttonLabel(isPushAsk: isPushAsk, isLast: isLast))
                    .font(.headline)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                LinearGradient(
                    colors: [.brand, .brandGlow],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundStyle(.white)
            .clipShape(.capsule)
            .shadow(color: .brand.opacity(0.45), radius: 14, y: 6)
        }
        .disabled(requestingPush)
    }

    private func buttonLabel(isPushAsk: Bool, isLast: Bool) -> String {
        if isPushAsk { return "Yes, notify me" }
        if isLast { return "Let's go" }
        return "Next"
    }

    private func advance(isPushAsk: Bool, isLast: Bool) async {
        if isPushAsk {
            requestingPush = true
            defer { requestingPush = false }
            _ = await PushService.shared.requestPermission()
            markPushAskHandled()
            finish()
            return
        }
        if isLast {
            finish()
        } else {
            await Haptics.impact(.light)
            withAnimation(.spring(duration: 0.5)) { page += 1 }
        }
    }

    private func markPushAskHandled() {
        UserDefaults.standard.set(true, forKey: "clipforge.pushAskedAfterFirstReady")
    }

    private func finish() {
        UserDefaults.standard.set(true, forKey: "clipforge.onboarded")
        onComplete()
    }

    // MARK: - Slides

    private func slide(_ p: Page, index: Int) -> some View {
        VStack(spacing: 24) {
            Spacer(minLength: 0)
            illustration(for: p.kind, isActive: index == page)
                .frame(height: 220)
                .padding(.horizontal, 24)

            VStack(spacing: 10) {
                Text(p.highlight)
                    .font(.caption.bold())
                    .padding(.horizontal, 12).padding(.vertical, 5)
                    .background(Color.brand.opacity(0.18))
                    .foregroundStyle(.brand)
                    .clipShape(.capsule)

                Text(p.title)
                    .font(.system(size: 34, weight: .bold))
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.7)
                    .padding(.horizontal)

                Text(p.body)
                    .font(.callout)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 28)
                    .lineLimit(4)
            }

            Spacer(minLength: 0)
        }
    }

    @ViewBuilder
    private func illustration(for kind: Page.Kind, isActive: Bool) -> some View {
        switch kind {
        case .splitClips:   SplitClipsIllustration(isActive: isActive)
        case .faceSwap:     FaceSwapIllustration(isActive: isActive)
        case .pricingStack: PricingStackIllustration(isActive: isActive)
        case .pushBanner:   PushBannerIllustration(isActive: isActive)
        }
    }

    // MARK: - Model

    private struct Page {
        let kind: Kind
        let title: String
        let body: String
        let highlight: String
        let isPushAsk: Bool

        enum Kind { case splitClips, faceSwap, pricingStack, pushBanner }
    }
}

// MARK: - Stage 1: long bar splits into clips

private struct SplitClipsIllustration: View {
    let isActive: Bool
    @State private var split = false

    var body: some View {
        ZStack {
            // The long source bar — visible until split, then fades.
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [Color.brand.opacity(0.35), Color.brandGlow.opacity(0.55)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .overlay(
                    HStack(spacing: 6) {
                        Image(systemName: "waveform")
                            .foregroundStyle(.white.opacity(0.9))
                        Text("Long video · 32 min")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.95))
                    }
                    .padding(.horizontal, 14)
                )
                .frame(height: 60)
                .opacity(split ? 0 : 1)
                .scaleEffect(split ? 0.85 : 1)

            // Grid of 6 mini-clip thumbnails appears once split=true
            HStack(spacing: 8) {
                ForEach(0..<3) { i in
                    miniClip(index: i)
                        .opacity(split ? 1 : 0)
                        .offset(y: split ? 0 : -8)
                        .animation(
                            .spring(duration: 0.55).delay(0.05 * Double(i) + 0.3),
                            value: split
                        )
                }
            }
            .offset(y: -42)

            HStack(spacing: 8) {
                ForEach(3..<6) { i in
                    miniClip(index: i)
                        .opacity(split ? 1 : 0)
                        .offset(y: split ? 0 : 8)
                        .animation(
                            .spring(duration: 0.55).delay(0.05 * Double(i - 3) + 0.45),
                            value: split
                        )
                }
            }
            .offset(y: 42)

            // Subtle scissors burst at the moment of split
            if split {
                Image(systemName: "scissors")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundStyle(.white)
                    .shadow(color: .brand.opacity(0.7), radius: 14)
                    .scaleEffect(split ? 1 : 0.4)
                    .opacity(0.0)
                    .transition(.opacity)
            }
        }
        .frame(maxWidth: .infinity)
        .onAppear { trigger() }
        .onChange(of: isActive) { _, active in if active { trigger() } }
    }

    private func miniClip(index: Int) -> some View {
        // Faux thumbnails — each tinted slightly differently to feel curated
        let palette: [(Color, Color)] = [
            (Color.brand, Color.brandGlow),
            (Color.purple, Color.pink),
            (Color.indigo, Color.blue),
            (Color.orange, Color.red),
            (Color.green, Color.teal),
            (Color.brand, Color.purple),
        ]
        let pair = palette[index % palette.count]
        return RoundedRectangle(cornerRadius: 10)
            .fill(
                LinearGradient(
                    colors: [pair.0.opacity(0.85), pair.1.opacity(0.75)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                Image(systemName: "play.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(.white.opacity(0.85))
            )
            .frame(width: 86, height: 64)
            .shadow(color: pair.0.opacity(0.4), radius: 6, y: 3)
    }

    private func trigger() {
        split = false
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 350_000_000)
            withAnimation(.spring(duration: 0.55)) { split = true }
        }
    }
}

// MARK: - Stage 2: face swap

private struct FaceSwapIllustration: View {
    let isActive: Bool
    @State private var swap = false

    var body: some View {
        ZStack {
            HStack(spacing: 64) {
                faceCard(
                    gradient: [.indigo, .blue],
                    icon: "person.crop.circle.fill",
                    label: "Source"
                )
                .offset(x: swap ? 80 : 0)
                .zIndex(swap ? 1 : 0)

                faceCard(
                    gradient: [.brand, .brandGlow],
                    icon: "person.crop.circle.badge.checkmark",
                    label: "Swapped"
                )
                .offset(x: swap ? -80 : 0)
                .zIndex(swap ? 0 : 1)
            }
            .animation(.spring(duration: 0.7), value: swap)

            // Sparkle particles when the swap completes
            if swap {
                ForEach(0..<6, id: \.self) { i in
                    Image(systemName: "sparkle")
                        .font(.system(size: 16))
                        .foregroundStyle(.white.opacity(0.9))
                        .offset(
                            x: CGFloat([-30, 12, 30, -8, 22, -22][i]),
                            y: CGFloat([-26, -34, -10, 32, 12, 28][i])
                        )
                        .opacity(swap ? 0 : 1)
                        .scaleEffect(swap ? 1.3 : 0.4)
                        .animation(
                            .easeOut(duration: 0.8).delay(0.4 + Double(i) * 0.04),
                            value: swap
                        )
                }
            }
        }
        .frame(maxWidth: .infinity)
        .onAppear { trigger() }
        .onChange(of: isActive) { _, active in if active { trigger() } }
    }

    private func faceCard(gradient: [Color], icon: String, label: String) -> some View {
        VStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: gradient.map { $0.opacity(0.85) },
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 84, height: 84)
                Image(systemName: icon)
                    .font(.system(size: 38))
                    .foregroundStyle(.white)
            }
            .shadow(color: gradient.first?.opacity(0.4) ?? .clear, radius: 10, y: 4)
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white.opacity(0.85))
        }
    }

    private func trigger() {
        swap = false
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 450_000_000)
            withAnimation(.spring(duration: 0.7)) { swap = true }
        }
    }
}

// MARK: - Stage 3: pricing tiers cascade

private struct PricingStackIllustration: View {
    let isActive: Bool
    @State private var stage = 0  // 0 = none, 1 = first card, 2 = two cards, 3 = three cards

    var body: some View {
        ZStack {
            // Card stack offset to simulate depth
            tierCard(label: "Weekly", price: "$5.99", credits: "10 cr / wk", colors: [.purple.opacity(0.6), .blue.opacity(0.5)])
                .offset(y: -50)
                .opacity(stage >= 1 ? 1 : 0)
                .scaleEffect(stage >= 1 ? 1 : 0.7)

            tierCard(label: "Monthly", price: "$14.99", credits: "40 cr / mo", colors: [.brand, .brandGlow])
                .scaleEffect(1.05)
                .opacity(stage >= 2 ? 1 : 0)
                .scaleEffect(stage >= 2 ? 1.05 : 0.7)

            tierCard(label: "Yearly · BEST", price: "$59.99", credits: "500 cr / yr", colors: [.green.opacity(0.85), .teal.opacity(0.8)])
                .offset(y: 50)
                .opacity(stage >= 3 ? 1 : 0)
                .scaleEffect(stage >= 3 ? 1 : 0.7)
        }
        .frame(maxWidth: .infinity)
        .onAppear { trigger() }
        .onChange(of: isActive) { _, active in if active { trigger() } }
    }

    private func tierCard(label: String, price: String, credits: String, colors: [Color]) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(.caption.weight(.bold))
                Text(credits).font(.caption2).foregroundStyle(.white.opacity(0.85))
            }
            Spacer()
            Text(price).font(.callout.weight(.bold))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .foregroundStyle(.white)
        .background(
            LinearGradient(colors: colors, startPoint: .leading, endPoint: .trailing)
        )
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: (colors.first ?? .black).opacity(0.4), radius: 10, y: 5)
        .padding(.horizontal, 32)
    }

    private func trigger() {
        stage = 0
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 250_000_000)
            withAnimation(.spring(duration: 0.5)) { stage = 1 }
            try? await Task.sleep(nanoseconds: 200_000_000)
            withAnimation(.spring(duration: 0.5)) { stage = 2 }
            try? await Task.sleep(nanoseconds: 200_000_000)
            withAnimation(.spring(duration: 0.5)) { stage = 3 }
        }
    }
}

// MARK: - Stage 4: push notification banner

private struct PushBannerIllustration: View {
    let isActive: Bool
    @State private var shown = false
    @State private var pulse = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            // Subtle bell with halo pulse behind the banner
            Circle()
                .stroke(Color.brand.opacity(0.4), lineWidth: 2)
                .frame(width: pulse ? 220 : 160, height: pulse ? 220 : 160)
                .opacity(pulse ? 0 : 1)
                .animation(.easeOut(duration: 1.6).repeatForever(autoreverses: false), value: pulse)

            VStack(spacing: 16) {
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: 48, weight: .bold))
                    .foregroundStyle(
                        LinearGradient(colors: [.brand, .brandGlow], startPoint: .top, endPoint: .bottom)
                    )

                // The notification banner
                HStack(spacing: 10) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(
                            LinearGradient(colors: [.brand, .brandGlow], startPoint: .top, endPoint: .bottom)
                        )
                        .frame(width: 36, height: 36)
                        .overlay(
                            Image(systemName: "scissors")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundStyle(.white)
                        )
                    VStack(alignment: .leading, spacing: 2) {
                        Text("ClipForge").font(.caption.weight(.semibold))
                        Text("Your clips are ready 🎬")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text("now")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .padding(10)
                .background(.ultraThinMaterial)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.08), lineWidth: 0.5))
                .offset(y: shown ? 0 : -60)
                .opacity(shown ? 1 : 0)
                .shadow(color: .black.opacity(0.35), radius: 14, y: 6)
                .padding(.horizontal, 28)
            }
        }
        .frame(maxWidth: .infinity)
        .onAppear {
            trigger()
            // Reduce Motion: hold the halo at full opacity (a static ring
            // instead of an endless outward pulse).
            pulse = !reduceMotion
        }
        .onChange(of: isActive) { _, active in if active { trigger() } }
    }

    private func trigger() {
        shown = false
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 400_000_000)
            withAnimation(.spring(duration: 0.65)) { shown = true }
        }
    }
}
