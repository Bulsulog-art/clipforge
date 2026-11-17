import SwiftUI
import UIKit
import DentVideoCore

/// The coloured chip on a video card: what state it is in, in words (never colour alone).
struct StateChip: View {
    let state: WeekBoard.CardState

    var body: some View {
        Label(L(Self.key(state)), systemImage: Self.icon(state))
            .font(.caption.weight(.semibold))
            .labelStyle(.titleAndIcon)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .foregroundStyle(foreground)
            .background(background, in: Capsule())
            .accessibilityElement(children: .combine)
    }

    static func key(_ s: WeekBoard.CardState) -> String {
        switch s {
        case .making: return "state.making"
        case .review: return "state.review"
        case .look: return "state.look"
        case .approved: return "state.approved"
        case .posted: return "state.posted"
        case .declined: return "state.declined"
        case .failed: return "state.failed"
        case .notMade: return "state.notMade"
        }
    }

    static func icon(_ s: WeekBoard.CardState) -> String {
        switch s {
        case .making: return "hourglass"
        case .review: return "eye"
        case .look: return "exclamationmark.bubble"
        case .approved: return "checkmark.circle.fill"
        case .posted: return "paperplane.fill"
        case .declined: return "xmark.circle"
        case .failed: return "exclamationmark.triangle"
        case .notMade: return "minus.circle"
        }
    }

    private var foreground: Color {
        switch state {
        case .approved, .posted: return .white
        case .look: return Theme.amber
        case .failed: return Theme.danger
        case .review: return Theme.teal
        default: return Theme.body
        }
    }

    private var background: Color {
        switch state {
        case .approved, .posted: return Theme.teal
        case .look: return Theme.amberSoft
        case .review: return Theme.teal.opacity(0.1)
        default: return Theme.sand
        }
    }
}

/// A calm full-width message with an icon: empty states, "no active plan", errors.
struct MessageView<Actions: View>: View {
    let icon: String
    let title: String
    let message: String
    @ViewBuilder var actions: () -> Actions

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Theme.teal)
                .accessibilityHidden(true)
            Text(title)
                .font(Theme.display(.title2))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
            Text(message)
                .font(.body)
                .foregroundStyle(Theme.body)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 10) { actions() }.padding(.top, 8)
        }
        .padding(28)
        .frame(maxWidth: 520)
    }
}

/// A poster image from a signed URL, sand placeholder while it loads.
struct Poster: View {
    let url: URL?
    var body: some View {
        ZStack {
            Theme.sand
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() } else { Image(systemName: "play.rectangle").font(.title2).foregroundStyle(Theme.muted) }
                }
            } else {
                Image(systemName: "film").font(.title2).foregroundStyle(Theme.muted)
            }
        }
        .clipped()
        .accessibilityHidden(true)
    }
}

/// The sentence for a software-check reason code, in the app's language.
func reasonText(_ r: ReviewReason) -> String { L("reason.\(r.rawValue)") }

/// The suggested posting moment: "Tue 12:30".
func slotText(_ slot: Slot?) -> String? { slot.map { PostKit.label(of: $0, locale: L10n.locale) } }

/// Banner for notices (saved, refused, offline).
struct NoticeBanner: View {
    let notice: AppModel.Notice
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: notice.isError ? "exclamationmark.circle" : "checkmark.circle").accessibilityHidden(true)
            Text(notice.text).font(.subheadline).frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
        .foregroundStyle(notice.isError ? Theme.danger : Theme.teal)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous).strokeBorder(Theme.line))
        .shadow(color: Theme.ink.opacity(0.08), radius: 12, y: 6)
        .padding(.horizontal, Theme.gutter)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.updatesFrequently)
    }
}

struct NoticeOverlay: ViewModifier {
    @Environment(AppModel.self) private var model
    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let n = model.notice {
                NoticeBanner(notice: n)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .task(id: n.id) {
                        UIAccessibility.post(notification: .announcement, argument: n.text)
                        try? await Task.sleep(for: .seconds(4))
                        if model.notice?.id == n.id { withAnimation { model.notice = nil } }
                    }
                    .onTapGesture { withAnimation { model.notice = nil } }
            }
        }
        .animation(.snappy, value: model.notice)
    }
}

extension View {
    func noticeOverlay() -> some View { modifier(NoticeOverlay()) }
}
