import SwiftUI
import UIKit
import DentVideoCore

/// This week's videos: watch, decide, post. Earlier weeks below.
struct WeekView: View {
    @Environment(AppModel.self) private var model
    @State private var path: [String] = []
    @State private var confirmAll = false
    @State private var showEarlier = false

    private var sections: [WeekBoard.Section] { WeekBoard.sections(model.items) }
    private var thisWeek: [VideoItem] { sections.first(where: { $0.week == model.currentWeek })?.items ?? [] }
    private var earlier: [WeekBoard.Section] { sections.filter { $0.week < model.currentWeek } }
    private var candidates: [VideoItem] { WeekBoard.approveAllCandidates(model.items, week: model.currentWeek) }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 18) {
                    header
                    if model.isOffline { offlineNote }
                    if thisWeek.isEmpty {
                        MessageView(icon: "calendar", title: L("week.empty.title"), message: L("week.empty.body")) { EmptyView() }
                            .frame(maxWidth: .infinity)
                            .dvCard()
                    } else {
                        if !candidates.isEmpty { approveAll }
                        ForEach(thisWeek) { item in
                            NavigationLink(value: item.id) { VideoCard(item: item) }
                                .buttonStyle(.plain)
                        }
                    }
                    if !earlier.isEmpty { earlierWeeks }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 32)
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.paper.ignoresSafeArea())
            .refreshable { await model.refresh() }
            .navigationTitle(L("week.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if model.isRefreshing { ProgressView().accessibilityLabel(L("common.loading")) }
                }
            }
            .navigationDestination(for: String.self) { id in VideoDetailView(itemID: id) }
            .confirmationDialog(L("week.approveAll.confirm", candidates.count), isPresented: $confirmAll, titleVisibility: .visible) {
                Button(L("week.approveAll.button", candidates.count)) {
                    Task {
                        let n = await model.approveAllReady(week: model.currentWeek)
                        if n > 0 { model.notice = .init(text: L("week.approveAll.done", n), isError: false) }
                    }
                }
                Button(L("common.cancel"), role: .cancel) {}
            } message: {
                Text(L("week.approveAll.note"))
            }
        }
        .onChange(of: model.openItemID, initial: true) { _, id in
            guard let id else { return }
            path = model.items.contains(where: { $0.id == id }) ? [id] : []
            model.openItemID = nil
        }
    }

    private var header: some View {
        let p = WeekBoard.progress(model.items, week: model.currentWeek)
        return VStack(alignment: .leading, spacing: 10) {
            Text(L10n.weekRange(model.currentWeek))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.teal)
                .textCase(.uppercase)
            Text(model.me?.clinic?.profile.name ?? L("week.title"))
                .font(Theme.display(.largeTitle))
                .foregroundStyle(Theme.ink)
                .accessibilityAddTraits(.isHeader)
            if p.total > 0 {
                ProgressView(value: Double(p.approved), total: Double(max(p.total, 1)))
                    .tint(Theme.teal)
                    .accessibilityLabel(L("week.progress.label"))
                    .accessibilityValue(L("week.progress", p.approved, p.total, p.posted))
                Text(L("week.progress", p.approved, p.total, p.posted))
                    .font(.footnote)
                    .foregroundStyle(Theme.muted)
                    .accessibilityHidden(true)
            }
        }
        .padding(.top, 8)
    }

    private var offlineNote: some View {
        Label {
            if let d = model.lastUpdated {
                Text(L("offline.saved", d.formatted(.relative(presentation: .named).locale(L10n.locale))))
            } else {
                Text(L("error.offline"))
            }
        } icon: {
            Image(systemName: "wifi.slash")
        }
        .font(.footnote)
        .foregroundStyle(Theme.muted)
    }

    private var approveAll: some View {
        Button { confirmAll = true } label: {
            Label(L("week.approveAll.button", candidates.count), systemImage: "checkmark.circle")
        }
        .buttonStyle(.dvPrimary)
        .accessibilityHint(L("week.approveAll.note"))
    }

    private var earlierWeeks: some View {
        VStack(alignment: .leading, spacing: 14) {
            Button {
                withAnimation(.snappy) { showEarlier.toggle() }
            } label: {
                HStack {
                    Text(L("week.earlier")).font(Theme.display(.title3)).foregroundStyle(Theme.ink)
                    Spacer()
                    Image(systemName: "chevron.down").rotationEffect(.degrees(showEarlier ? 180 : 0)).foregroundStyle(Theme.muted)
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(.isHeader)
            .accessibilityValue(showEarlier ? L("common.expanded") : L("common.collapsed"))
            if showEarlier {
                ForEach(earlier) { section in
                    Text(L10n.weekRange(section.week)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.muted).padding(.top, 6)
                    ForEach(section.items) { item in
                        NavigationLink(value: item.id) { VideoCard(item: item, compact: true) }.buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.top, 12)
    }
}

/// One video in the list: poster, title, state, suggested time.
struct VideoCard: View {
    let item: VideoItem
    var compact = false
    @Environment(\.dynamicTypeSize) private var type

    var body: some View {
        let state = WeekBoard.state(of: item)
        let layout = type.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 12)) : AnyLayout(HStackLayout(alignment: .top, spacing: 14))
        layout {
            Poster(url: item.thumbUrl)
                .frame(width: compact ? 54 : 78, height: compact ? 96 : 138)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 8) {
                StateChip(state: state)
                Text(item.title)
                    .font(compact ? .subheadline.weight(.semibold) : .headline)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                if let s = slotText(item.slot), state != .declined, state != .notMade {
                    Label(L("video.postOn", s), systemImage: "calendar")
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                }
                if state == .look, let r = item.reasons.first {
                    Text(reasonText(r)).font(.footnote).foregroundStyle(Theme.amber).lineLimit(3)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.muted).accessibilityHidden(true)
        }
        .padding(14)
        .dvCard()
        .accessibilityElement(children: .combine)
        .accessibilityHint(L("video.open.hint"))
    }
}

#Preview { WeekView().environment(AppModel.preview()) }
