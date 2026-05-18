import SwiftUI

struct NewProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var url = ""
    @State private var niche: String
    @State private var sending = false
    @State private var showPaywall = false
    @State private var error: String?
    let seed: NewProjectSeed?
    let onCreated: () -> Void

    init(seed: NewProjectSeed? = nil, onCreated: @escaping () -> Void) {
        self.seed = seed
        self.onCreated = onCreated
        _niche = State(initialValue: seed?.niche ?? "motivation")
    }

    private let niches = ["motivation", "business", "finance", "health", "tech",
                          "education", "comedy", "fitness", "spirituality"]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: "creditcard.circle.fill")
                            .foregroundStyle(.brand)
                        Text("Balance")
                        Spacer()
                        Text("\(credits.balance) credits")
                            .foregroundStyle(.secondary)
                    }
                    Button {
                        showPaywall = true
                    } label: {
                        Label("Buy more credits", systemImage: "plus.circle.fill")
                    }
                    .tint(.brand)
                }

                if let hook = seed?.hook {
                    Section {
                        VStack(alignment: .leading, spacing: 6) {
                            Label("Trending hook", systemImage: "sparkles")
                                .font(.caption.bold())
                                .foregroundStyle(.brand)
                            Text("\"\(hook)\"")
                                .font(.callout.italic())
                            Text("Drop a video that fits this hook — we'll auto-pick the moment.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Video source") {
                    TextField("YouTube or TikTok URL", text: $url)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                }

                Section("Niche") {
                    Picker("Niche", selection: $niche) {
                        ForEach(niches, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                }

                if let error {
                    Section { Text(error).foregroundStyle(.red).font(.callout) }
                }

                Section {
                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if sending { ProgressView() }
                            Text(credits.balance >= 1 ? "Generate clips · 1 credit" : "Buy credits to start")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .tint(.brand)
                    .disabled(url.isEmpty || sending)
                }
            }
            .navigationTitle("New project")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .sheet(isPresented: $showPaywall) {
                CreditsPaywallView()
            }
            .task { await credits.refresh() }
        }
    }

    private func submit() async {
        // No credits → show paywall instead of API call
        guard credits.canStartVideo() else { showPaywall = true; return }

        sending = true
        defer { sending = false }
        do {
            try await ClipForgeAPI.shared.createJob(sourceUrl: url, niche: niche)
            await credits.refresh()
            onCreated()
            dismiss()
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch let e {
            error = e.localizedDescription
        }
    }
}
