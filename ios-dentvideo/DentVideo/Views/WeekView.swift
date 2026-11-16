import SwiftUI

/// This week's videos: one status line, one action ("approve all").
struct WeekView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if model.isDemo { DemoBanner() }
                header
                if let week = model.currentWeek {
                    summary(week)
                    LazyVStack(spacing: 14) {
                        ForEach(week.items) { item in
                            NavigationLink(value: item.id) { VideoCard(item: item) }
                                .buttonStyle(.plain)
                        }
                    }
                    if !model.isDemo { EducationNote().padding(.top, 4) }
                } else if !model.loading {
                    EmptyWeek(clinic: model.clinic)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
        }
        .background(Color.dvPaper.ignoresSafeArea())
        .navigationTitle(model.clinic?.name ?? "DentVideo")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(for: String.self) { id in VideoDetailView(itemID: id) }
        .refreshable { await model.refresh() }
        .overlay { if model.loading && model.weeks.isEmpty { ProgressView() } }
        .alert("Couldn't update", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(model.error ?? "") }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(model.currentWeek.map { WeekLabel.title($0.weekOf) } ?? String(localized: "This week"))
                .font(.title2.bold())
                .foregroundStyle(Color.dvInk)
            Text("New videos arrive every Monday.")
                .font(.subheadline)
                .foregroundStyle(Color.dvMuted)
        }
    }

    @ViewBuilder
    private func summary(_ week: Week) -> some View {
        if week.needsReview > 0 {
            VStack(alignment: .leading, spacing: 12) {
                Text("\(week.needsReview) videos are waiting for your approval.")
                    .font(.headline)
                    .foregroundStyle(Color.dvInk)
                Text("Watch each one, or approve them all if you have already checked them.")
                    .font(.subheadline)
                    .foregroundStyle(Color.dvBody)
                Button("Approve all \(week.needsReview)") { Task { await model.approveAll(in: week) } }
                    .buttonStyle(PrimaryButtonStyle())
                    .accessibilityIdentifier("approve-all")
            }
            .padding(16)
            .background(Color.dvTint, in: .rect(cornerRadius: 18))
        } else if week.approved > 0 {
            Label("All set for this week. Approved videos are ready to post.", systemImage: "checkmark.seal.fill")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Color.dvTeal)
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.dvTint, in: .rect(cornerRadius: 14))
        }
    }
}

struct DemoBanner: View {
    @Environment(AppModel.self) private var model
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "sparkles").foregroundStyle(Color.dvClay)
            VStack(alignment: .leading, spacing: 4) {
                Text("Sample clinic").font(.subheadline.bold()).foregroundStyle(Color.dvInk)
                Text("These are DentVideo's sample videos. A clinic's real week has five, with its own logo and colours. Your choices here stay on this phone.")
                    .font(.footnote)
                    .foregroundStyle(Color.dvBody)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.dvSand, in: .rect(cornerRadius: 14))
        .accessibilityIdentifier("demo-banner")
    }
}

struct EmptyWeek: View {
    let clinic: Clinic?
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 40))
                .foregroundStyle(Color.dvTeal)
            Text(clinic?.paused == true ? LocalizedStringKey("Your videos are paused.") : LocalizedStringKey("No videos yet."))
                .font(.headline)
                .foregroundStyle(Color.dvInk)
            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(Color.dvBody)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 50)
        .padding(.horizontal, 20)
    }

    private var message: String {
        if clinic?.paused == true { return String(localized: "DentVideo has paused this clinic's videos. Write to hello@dentvideo.com if this is unexpected.") }
        if clinic?.active == true { return String(localized: "Your clinic's videos are being prepared. They appear here as soon as they are ready, every Monday.") }
        return String(localized: "This clinic has no videos to review yet. When videos are made for your clinic, they appear here.")
    }
}

/// One video in the list: poster, title, one status.
struct VideoCard: View {
    let item: VideoItem

    var body: some View {
        HStack(spacing: 14) {
            Poster(url: item.thumbURL)
                .frame(width: 72, height: 128)
                .clipShape(.rect(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 8) {
                Text(item.title)
                    .font(.headline)
                    .foregroundStyle(Color.dvInk)
                    .multilineTextAlignment(.leading)
                    .lineLimit(3)
                StageChip(item: item)
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").foregroundStyle(Color.dvMuted)
        }
        .padding(12)
        .background(Color.white, in: .rect(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.dvLine))
        .accessibilityElement(children: .combine)
    }
}

struct Poster: View {
    let url: URL?
    var body: some View {
        ZStack {
            Color.dvSand
            if let url {
                AsyncImage(url: url) { phase in
                    if let image = phase.image { image.resizable().scaledToFill() } else { Image(systemName: "film").foregroundStyle(Color.dvMuted) }
                }
            } else {
                Image(systemName: "hourglass").foregroundStyle(Color.dvMuted)
            }
        }
    }
}

struct StageChip: View {
    let item: VideoItem
    var body: some View {
        let (text, color, icon): (String, Color, String) = {
            switch item.stage {
            case .making: return (String(localized: "Being made"), .dvMuted, "hourglass")
            case .needsReview: return (String(localized: "Needs your approval"), .dvClay, "eye")
            case .approved: return (item.postedAt != nil ? String(localized: "Approved · posted") : String(localized: "Approved"), .dvTeal, "checkmark.circle.fill")
            case .changesRequested: return (String(localized: "Not approved"), .dvBody, "xmark.circle")
            case .unavailable: return (String(localized: "Replaced"), .dvMuted, "arrow.triangle.2.circlepath")
            }
        }()
        return Label(text, systemImage: icon)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color.opacity(0.1), in: .capsule)
    }
}
