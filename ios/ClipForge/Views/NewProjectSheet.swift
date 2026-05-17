import SwiftUI
import RevenueCatUI

struct NewProjectSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var rc = RevenueCatService.shared
    @State private var url = ""
    @State private var niche = "motivation"
    @State private var sending = false
    @State private var showPaywall = false
    let onCreated: () -> Void

    let niches = ["motivation", "business", "finance", "health", "tech",
                  "education", "comedy", "fitness", "spirituality"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Video source") {
                    TextField("YouTube or TikTok URL", text: $url)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                }
                Section("Niche") {
                    Picker("Niche", selection: $niche) {
                        ForEach(niches, id: \.self) { Text($0).tag($0) }
                    }
                }
                Section {
                    Button {
                        Task { await submit() }
                    } label: {
                        HStack { if sending { ProgressView() }
                            Text("Generate clips").fontWeight(.semibold) }
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(url.isEmpty || sending)
                }
            }
            .navigationTitle("New project")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
            .sheet(isPresented: $showPaywall) {
                PaywallView()
                    .onPurchaseCompleted { _ in Task { await submit() } }
            }
        }
    }

    private func submit() async {
        if !rc.hasAnyPaid {
            // Free tier users still allowed for 2 videos/mo — let server decide
        }
        sending = true
        defer { sending = false }
        do {
            try await ClipForgeAPI.shared.createJob(sourceUrl: url, niche: niche)
            onCreated()
            dismiss()
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch { print(error) }
    }
}
