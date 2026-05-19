import SwiftUI

struct OnboardingView: View {
    let onComplete: () -> Void

    @State private var page = 0
    @State private var requestingPush = false

    private let pages: [Page] = [
        Page(
            icon: "scissors",
            title: "Long video.\n100+ viral clips.",
            body: "Drop a YouTube link or your podcast — ClipForge finds the moments worth sharing and edits them with TikTok-style captions, automatically.",
            highlight: "AI does the editing",
            isPushAsk: false
        ),
        Page(
            icon: "person.crop.square.filled.and.at.rectangle",
            title: "Face Swap.\nTranslate.\nGo viral.",
            body: "Swap any face on a clip in 30 seconds (SwapTok-grade). Translate captions to 15+ languages. AI avatars that speak your script in 6 voices.",
            highlight: "Klap + HeyGen + Reface in one",
            isPushAsk: false
        ),
        Page(
            icon: "bolt.circle.fill",
            title: "One free taste,\nthen Plus.",
            body: "One clip set on the house — see the magic. Then Plus weekly $4.99 (10 cr/wk) or monthly $14.99 (40 cr/mo, save 25%). Top up with +10 or +20 packs.",
            highlight: "Cancel anytime · refund-safe",
            isPushAsk: false
        ),
        Page(
            icon: "bell.badge.fill",
            title: "Get notified\nwhen clips drop.",
            body: "Renders take 60–120 seconds. We'll ping you the moment your viral set is ready, plus a heads-up when credits run low.",
            highlight: "We never spam — only render alerts",
            isPushAsk: true
        ),
    ]

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.appBackground, Color.brand.opacity(0.18)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ).ignoresSafeArea()

            VStack(spacing: 24) {
                TabView(selection: $page) {
                    ForEach(pages.indices, id: \.self) { i in
                        slide(pages[i]).tag(i)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut, value: page)

                HStack(spacing: 8) {
                    ForEach(pages.indices, id: \.self) { i in
                        Capsule()
                            .fill(i == page ? Color.brand : Color.white.opacity(0.25))
                            .frame(width: i == page ? 24 : 8, height: 8)
                            .animation(.spring, value: page)
                    }
                }

                primaryButton

                if pages[page].isPushAsk {
                    Button("Maybe later") {
                        Task { await Haptics.impact(.light) }
                        markPushAskHandled()
                        finish()
                    }
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }
            }
            .padding(.bottom, 16)
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
            .background(Color.brand)
            .foregroundStyle(.white)
            .clipShape(.capsule)
        }
        .disabled(requestingPush)
        .padding(.horizontal, 32)
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
            withAnimation { page += 1 }
        }
    }

    /// We've already shown a soft ask — don't double-prompt later on first-ready.
    private func markPushAskHandled() {
        UserDefaults.standard.set(true, forKey: "clipforge.pushAskedAfterFirstReady")
    }

    private func finish() {
        UserDefaults.standard.set(true, forKey: "clipforge.onboarded")
        onComplete()
    }

    private func slide(_ p: Page) -> some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.18))
                    .frame(width: 160, height: 160)
                Image(systemName: p.icon)
                    .font(.system(size: 64, weight: .bold))
                    .foregroundStyle(.brand)
            }

            VStack(spacing: 8) {
                Text(p.highlight)
                    .font(.caption.bold())
                    .padding(.horizontal, 12).padding(.vertical, 4)
                    .background(Color.brand.opacity(0.18))
                    .foregroundStyle(.brand)
                    .clipShape(.capsule)

                Text(p.title)
                    .font(.system(size: 36, weight: .bold))
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.7)
                    .padding(.horizontal)

                Text(p.body)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
            }

            Spacer()
            Spacer()
        }
    }

    private struct Page {
        let icon: String
        let title: String
        let body: String
        let highlight: String
        let isPushAsk: Bool
    }
}
