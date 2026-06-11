import SwiftUI
import UIKit

/// In-app feedback sheet — opens from Settings. Captures a short message
/// + device context, posts to /api/feedback. Lower-friction than a mailto:
/// link because the user never leaves the app and we collect the version
/// metadata automatically for triage.
@MainActor
struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var message: String = ""
    @State private var sending = false
    @State private var error: String?
    @State private var sent = false
    @FocusState private var editorFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    headerCard
                    if sent {
                        successCard
                    } else {
                        editor
                        if let error { errorCard(error) }
                        sendButton
                    }
                    footnote
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Send feedback")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .onAppear { editorFocused = true }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("We read every message", systemImage: "envelope.open.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(.brand)
            Text("Bug, feature wish, or just a note — type away. We'll see your message with your account info attached so we can write back if needed.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var editor: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextEditor(text: $message)
                .focused($editorFocused)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 170)
                .padding(10)
                .background(Color.cardBackground)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.hairline, lineWidth: 1)
                )
            HStack {
                Spacer()
                Text("\(message.count) / 4000")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.textSecondary.opacity(0.6))
            }
        }
    }

    private var sendButton: some View {
        Button {
            Task { await send() }
        } label: {
            HStack {
                if sending { ProgressView().tint(.white) }
                Image(systemName: sending ? "" : "paperplane.fill")
                    .opacity(sending ? 0 : 1)
                Text(sending ? "Sending…" : "Send feedback")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [.brand, .brandGlow],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundStyle(.white)
            .clipShape(.rect(cornerRadius: 14))
            .opacity(canSend ? 1 : 0.45)
        }
        .buttonStyle(.plain)
        .disabled(!canSend)
    }

    private var canSend: Bool {
        !sending && message.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
    }

    private var successCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 44))
                .foregroundStyle(.green)
            Text("Got it!").font(.title3.bold()).foregroundStyle(.textPrimary)
            Text("Thanks for the note — we'll read it within a day or two and write back if it warrants a reply.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button {
                dismiss()
            } label: {
                Text("Done")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 36)
                    .padding(.vertical, 12)
                    .background(Color.brand)
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
            }
            .buttonStyle(.plain)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 28)
    }

    private func errorCard(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(message).font(.callout).foregroundStyle(.red)
            Spacer(minLength: 4)
        }
        .padding(12)
        .background(Color.red.opacity(0.12))
        .clipShape(.rect(cornerRadius: 12))
    }

    private var footnote: some View {
        Text("Attached: app version + iOS version + device model. No clip content, no contacts, no location.")
            .font(.caption2)
            .foregroundStyle(.textSecondary.opacity(0.6))
            .multilineTextAlignment(.leading)
            .padding(.top, 4)
    }

    private func send() async {
        let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        sending = true
        error = nil
        defer { sending = false }
        do {
            try await ClipForgeAPI.shared.sendFeedback(
                message: trimmed,
                appVersion: Self.appVersionString(),
                osVersion: Self.osVersionString(),
                deviceModel: Self.deviceModelString()
            )
            await Haptics.notify(.success)
            sent = true
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private static func appVersionString() -> String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v) (\(b))"
    }

    private static func osVersionString() -> String {
        let v = UIDevice.current.systemVersion
        return "iOS \(v)"
    }

    /// Returns the hardware identifier (e.g. "iPhone15,3"). UIDevice.current.model
    /// only gives generic "iPhone" — uname() is the standard escape hatch on iOS.
    private static func deviceModelString() -> String {
        var info = utsname()
        uname(&info)
        let mirror = Mirror(reflecting: info.machine)
        let chars: [CChar] = mirror.children.compactMap { $0.value as? CChar }
        return String(cString: chars.filter { $0 != 0 } + [0])
    }
}
