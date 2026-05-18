import SwiftUI

struct OnboardingView: View {
    let onComplete: () -> Void

    @State private var page = 0
    private let pages: [Page] = [
        Page(
            icon: "scissors",
            title: "Long video.\n100+ viral clips.",
            body: "Drop a YouTube link or your podcast — ClipForge finds the moments worth sharing and edits them with TikTok-style captions, automatically.",
            highlight: "AI does the editing"
        ),
        Page(
            icon: "person.crop.square.filled.and.at.rectangle",
            title: "Face Swap.\nTranslate.\nGo viral.",
            body: "Swap any face on a clip in 30 seconds (SwapTok-grade). Translate captions to 15+ languages. Voice clone in your own voice.",
            highlight: "Klap + HeyGen + Reface in one"
        ),
        Page(
            icon: "bolt.circle.fill",
            title: "One free taste,\nthen Plus.",
            body: "One clip set on the house — see the magic. Then Plus weekly $4.99 (10 cr/wk) or monthly $14.99 (40 cr/mo, save 25%). Top up with +10 or +20 packs.",
            highlight: "Cancel anytime · refund-safe"
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

                Button {
                    if page < pages.count - 1 {
                        withAnimation { page += 1 }
                    } else {
                        UserDefaults.standard.set(true, forKey: "clipforge.onboarded")
                        onComplete()
                    }
                } label: {
                    Text(page < pages.count - 1 ? "Next" : "Let's go")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.brand)
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 16)
            }
        }
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
    }
}
