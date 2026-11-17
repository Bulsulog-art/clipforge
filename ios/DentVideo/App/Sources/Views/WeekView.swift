import SwiftUI
import UIKit
import DentVideoCore

/// This week's videos: watch, decide, post. Earlier weeks below.
struct WeekView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var path: [String] = []
    @State private var confirmAll = false
    @State private var showEarlier = false
    @State private var approvedBatch = 0
    /// A video a link or notification asked for, opened once the week tab is on screen.
    @State private var pendingOpen: String?
    @Environment(\.dynamicTypeSize) private var type

    private var sections: [WeekBoard.Section] { WeekBoard.sections(model.items) }
    private var thisWeek: [VideoItem] { sections.first(where: { $0.week == model.currentWeek })?.items ?? [] }
    private var earlier: [WeekBoard.Section] { sections.filter { $0.week < model.currentWeek } }
    private var candidates: [VideoItem] { WeekBoard.approveAllCandidates(model.items, week: model.currentWeek) }

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: Theme.s4) {
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
                                .accessibilityIdentifier("card.\(item.id)")
                        }
                    }
                    if !earlier.isEmpty { earlierWeeks }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, Theme.s6)
                .readableWidth()
            }
            .background(Theme.paper.ignoresSafeArea())
            .refreshable { await model.refresh() }
            .navigationTitle(L("week.title"))
            .navigationBarTitleDisplayMode(.large)
            .navigationDestination(for: String.self) { id in VideoDetailView(itemID: id) }
            .sensoryFeedback(.success, trigger: approvedBatch)
            .alert(L("week.approveAll.confirm", candidates.count), isPresented: $confirmAll) {
                Button(L("common.cancel"), role: .cancel) {}
                Button(L("week.approveAll.button", candidates.count)) {
                    Task {
                        let n = await model.approveAllReady(week: model.currentWeek)
                        if n > 0 {
                            approvedBatch += 1
                            model.notice = .init(text: L("week.approveAll.done", n), isError: false)
                        }
                    }
                }
            } message: {
                Text(L("week.approveAll.note"))
            }
        }
        .onChange(of: model.openItemID, initial: true) { _, id in
            guard let id else { return }
            model.openItemID = nil
            pendingOpen = id
            openPending()
        }
        // On iOS 17 a path set while the week tab is still hidden is dropped (a notification tap
        // from Settings opened only the week): open it again when the tab is on screen.
        .onAppear { openPending() }
        .onChange(of: model.tab) { _, tab in if tab == .week { openPending() } }
        .onChange(of: model.items.map(\.id)) { _, _ in openPending() }
        .onChange(of: model.isRefreshing) { _, _ in openPending() }
        .task {
            if model.isDemo("approve-all") {
                try? await Task.sleep(for: .milliseconds(400))
                confirmAll = true
            }
            if model.isDemo("week-empty") { showEarlier = true }
        }
    }

    private func openPending() {
        // iOS 17 does not run onChange on a tab that is not on screen: pick the request up here.
        if let id = model.openItemID {
            model.openItemID = nil
            pendingOpen = id
        }
        guard let id = pendingOpen else { return }
        guard model.items.contains(where: { $0.id == id }) else {
            // A notification tap that starts the app arrives before the week is loaded: wait
            // for it (onChange of the items calls this again). Unknown after loading: stay on the week.
            if model.items.isEmpty || model.isRefreshing { return }
            pendingOpen = nil
            return
        }
        Task {
            try? await Task.sleep(for: .milliseconds(350))
            guard pendingOpen == id else { return }
            path = [id]
            pendingOpen = nil
        }
    }

    private var header: some View {
        let p = WeekBoard.progress(model.items, week: model.currentWeek)
        return VStack(alignment: .leading, spacing: Theme.s2) {
            let row = type.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: Theme.s1)) : AnyLayout(HStackLayout(alignment: .firstTextBaseline, spacing: Theme.s2))
            row {
                Text(L10n.weekRange(model.currentWeek))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.teal)
                if let name = model.me?.clinic?.profile.name {
                    Text(name)
                        .font(.subheadline)
                        .foregroundStyle(Theme.muted)
                        .lineLimit(1)
                }
            }
            if p.total > 0 {
                WeekProgressBar(value: Double(p.approved), total: Double(p.total))
                    .padding(.top, Theme.s1)
                    .accessibilityHidden(true)
                Text(L("week.progress", p.approved, p.total, p.posted))
                    .font(.footnote)
                    .foregroundStyle(Theme.body)
                    .monospacedDigit()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(L("week.progress.label"))
        .accessibilityValue(p.total > 0 ? "\(L10n.weekRange(model.currentWeek)), \(L("week.progress", p.approved, p.total, p.posted))" : L10n.weekRange(model.currentWeek))
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
        .font(.footnote.weight(.medium))
        .foregroundStyle(Theme.body)
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.sand, in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
        .accessibilityIdentifier("week.offline")
    }

    private var approveAll: some View {
        Button { confirmAll = true } label: {
            Label(L("week.approveAll.button", candidates.count), systemImage: "checkmark.circle")
        }
        .buttonStyle(.dvPrimary)
        .accessibilityHint(L("week.approveAll.note"))
        .accessibilityIdentifier("week.approveAll")
    }

    private var earlierWeeks: some View {
        VStack(alignment: .leading, spacing: Theme.s3) {
            Button {
                motion(reduceMotion) { showEarlier.toggle() }
            } label: {
                HStack {
                    Text(L("week.earlier")).font(Theme.display(.title3)).foregroundStyle(Theme.ink)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.subheadline.weight(.semibold))
                        .rotationEffect(.degrees(showEarlier ? 180 : 0))
                        .foregroundStyle(Theme.muted)
                        .accessibilityHidden(true)
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(.isHeader)
            .accessibilityValue(showEarlier ? L("common.expanded") : L("common.collapsed"))
            if showEarlier {
                ForEach(earlier) { section in
                    Text(L10n.weekRange(section.week))
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                        .padding(.top, Theme.s1)
                        .accessibilityAddTraits(.isHeader)
                    ForEach(section.items) { item in
                        NavigationLink(value: item.id) { VideoCard(item: item, compact: true) }.buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(.top, Theme.s2)
    }
}

/// One video in the list: poster, title, state, suggested time.
struct VideoCard: View {
    let item: VideoItem
    var compact = false
    @Environment(\.dynamicTypeSize) private var type
    @ScaledMetric(relativeTo: .body) private var posterWidth: CGFloat = 76

    var body: some View {
        let state = WeekBoard.state(of: item)
        let stacked = type.isAccessibilitySize
        let width = compact ? 52 : min(posterWidth, 110)
        let layout = stacked ? AnyLayout(VStackLayout(alignment: .leading, spacing: Theme.s3)) : AnyLayout(HStackLayout(alignment: .center, spacing: Theme.s4))
        layout {
            Poster(id: item.id, url: item.thumbUrl, working: state == .making, delayed: state == .failed)
                .frame(width: stacked ? 96 : width, height: (stacked ? 96 : width) * 16 / 9)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous).strokeBorder(Theme.line.opacity(0.6)))
            VStack(alignment: .leading, spacing: Theme.s2) {
                StateChip(state: state)
                Text(item.title)
                    .font(compact ? .subheadline.weight(.semibold) : .headline)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                if let s = slotText(item.slot), state != .declined, state != .notMade, state != .failed {
                    Label(L("video.postOn", s), systemImage: "calendar")
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                }
                if state == .look, let r = item.reasons.first, !compact {
                    Text(reasonText(r)).font(.footnote).foregroundStyle(Theme.amber)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if state == .failed, !compact {
                    Text(L("video.failed")).font(.footnote).foregroundStyle(Theme.body)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(compact ? Theme.s3 : 14)
        // The chevron sits outside the row's layout, so the text column's width is fixed before
        // its height is measured (long German or Polish notes are never cut off).
        .padding(.trailing, stacked ? 0 : Theme.s4)
        .overlay(alignment: .trailing) {
            if !stacked {
                Image(systemName: "chevron.forward").font(.footnote.weight(.semibold)).foregroundStyle(Theme.muted.opacity(0.7))
                    .padding(.trailing, 14)
                    .accessibilityHidden(true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .dvCard()
        .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityHint(L("video.open.hint"))
    }
}

#Preview { WeekView().environment(AppModel.preview()) }
