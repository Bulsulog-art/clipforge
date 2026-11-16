import SwiftUI

/// Every week so far, newest first.
struct LibraryView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        List {
            if model.weeks.isEmpty {
                Text("Your past weeks will appear here.")
                    .foregroundStyle(Color.dvMuted)
                    .listRowBackground(Color.clear)
            }
            ForEach(model.weeks) { week in
                Section(WeekLabel.title(week.weekOf)) {
                    ForEach(week.items) { item in
                        NavigationLink(value: item.id) {
                            HStack(spacing: 12) {
                                Poster(url: item.thumbURL)
                                    .frame(width: 40, height: 70)
                                    .clipShape(.rect(cornerRadius: 8))
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(item.title).font(.subheadline.weight(.semibold)).foregroundStyle(Color.dvInk).lineLimit(2)
                                    StageChip(item: item)
                                }
                            }
                        }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .background(Color.dvPaper.ignoresSafeArea())
        .navigationTitle("Library")
        .navigationDestination(for: String.self) { id in VideoDetailView(itemID: id) }
        .refreshable { await model.refresh() }
    }
}
