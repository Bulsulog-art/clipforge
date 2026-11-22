import SwiftUI
import UIKit
import DentVideoCore

/// The clinic's own requests, as on the web (web/src/components/dentvid/clinic-requests.tsx), with
/// the web's wording and limits (Core/Requests.swift):
///   TopicEntry / TopicSheet   "Suggest a topic for next week" (the week) and what became of each
///   ChangeSheet / ChangeNote  "Ask for a change" on one video (next to Decline) and its status
///   SubtitlesRow              "Download subtitles (.srt)" in the post sheet, through the share sheet

// MARK: Topic suggestions

/// The row in the week that opens the suggestions.
struct TopicEntry: View {
    @Binding var open: Bool

    var body: some View {
        Button { open = true } label: {
            HStack(spacing: Theme.s3) {
                Image(systemName: "lightbulb")
                    .font(.title3)
                    .foregroundStyle(Theme.teal)
                    .frame(width: 40, height: 40)
                    .background(Theme.teal.opacity(0.1), in: Circle())
                    .accessibilityHidden(true)
                Text(L("topics.title"))
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "chevron.forward")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Theme.muted.opacity(0.7))
                    .accessibilityHidden(true)
            }
            .padding(14)
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
            .dvCard()
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityHint(L("topics.lead"))
        .accessibilityIdentifier("week.suggestTopic")
    }
}

/// "Suggest a topic for next week": one sentence, 3 to 140 characters, and the clinic's earlier
/// suggestions with what became of them. Waiting ones can be removed.
struct TopicSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var topics: [TopicRequest] = []
    /// nil while loading; false: the server has nowhere to keep suggestions yet.
    @State private var available: Bool?
    @State private var loadError: String?
    @State private var busy = false
    @State private var message: (ok: Bool, text: String)?
    @FocusState private var focused: Bool

    private var waiting: Int { RequestRules.waiting(topics) }
    private var count: Int { RequestRules.length(text) }
    private var canSend: Bool { !busy && RequestRules.canSendTopic(text) && waiting < RequestRules.pendingTopicsMax }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {
                    Text(L("topics.lead"))
                        .font(.body)
                        .foregroundStyle(Theme.body)
                        .fixedSize(horizontal: false, vertical: true)
                    content
                }
                .padding(Theme.s5)
                .readableWidth(560)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("topics.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L("common.close")) { dismiss() }.accessibilityIdentifier("topics.close")
                }
            }
            .task { await load() }
        }
        .presentationDetents([.large])
        .presentationBackground(Theme.paper)
    }

    @ViewBuilder private var content: some View {
        if available == nil && loadError == nil {
            ProgressView().frame(maxWidth: .infinity, minHeight: 120).accessibilityLabel(L("common.loading"))
        } else if let loadError {
            VStack(spacing: Theme.s3) {
                ErrorBox(text: loadError, id: "topics.loadError")
                Button(L("common.retry")) { Task { await load() } }.buttonStyle(.dvSecondary)
            }
        } else if available == false {
            ErrorBox(text: L("topics.error.unavailable"), id: "topics.unavailable")
        } else {
            form
            if !topics.isEmpty { list }
        }
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text(L("topics.label")).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
            TextField(L("topics.placeholder"), text: $text, axis: .vertical)
                .lineLimit(2...4)
                .focused($focused)
                .padding(14)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous).strokeBorder(focused ? Theme.teal : Theme.line))
                .onChange(of: text) { _, v in
                    // One line, as on the web; the limit counts as the server does.
                    if v.contains("\n") { text = v.replacingOccurrences(of: "\n", with: " ") }
                    let cut = RequestRules.limit(text, to: RequestRules.topicMax)
                    if cut != text { text = cut }
                }
                .accessibilityLabel(L("topics.label"))
                .accessibilityIdentifier("topics.field")
            CharCounter(count: count, max: RequestRules.topicMax)
            if waiting >= RequestRules.pendingTopicsMax {
                Text(L("topics.error.tooManyPending"))
                    .font(.footnote)
                    .foregroundStyle(Theme.amber)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("topics.full")
            }
            Button {
                Task { await send() }
            } label: {
                if busy {
                    HStack(spacing: Theme.s2) { ProgressView().tint(Theme.onFill); Text(L("topics.sending")) }
                } else {
                    Text(L("topics.submit"))
                }
            }
            .buttonStyle(.dvPrimary)
            .disabled(!canSend)
            .accessibilityIdentifier("topics.submit")
            .padding(.top, Theme.s1)
            if let message {
                if message.ok {
                    Label(message.text, systemImage: "checkmark.circle.fill")
                        .font(.subheadline)
                        .foregroundStyle(Theme.teal)
                        .padding(Theme.s3)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.teal.opacity(0.1), in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("topics.sent")
                } else {
                    ErrorBox(text: message.text, id: "topics.error")
                }
            }
        }
    }

    private var list: some View {
        VStack(alignment: .leading, spacing: Theme.s2) {
            Text(L("topics.listTitle"))
                .font(.headline)
                .foregroundStyle(Theme.ink)
                .accessibilityAddTraits(.isHeader)
                .padding(.top, Theme.s3)
            VStack(spacing: 0) {
                ForEach(Array(topics.prefix(12).enumerated()), id: \.element.id) { n, t in
                    if n > 0 { Divider().overlay(Theme.line) }
                    TopicRow(topic: t) { Task { await withdraw(t) } }
                }
            }
            .dvCard()
        }
    }

    private func load() async {
        loadError = nil
        do {
            let a = try await model.api.topics()
            topics = a.topics
            available = a.available
        } catch {
            if case APIError.unauthorized? = error as? APIError { model.handle(error); dismiss(); return }
            loadError = model.message(for: error)
        }
    }

    private func send() async {
        guard canSend else { return }
        busy = true
        message = nil
        defer { busy = false }
        do {
            let sent = try await model.api.suggestTopic(text)
            topics.insert(sent.topic, at: 0)
            text = ""
            focused = false
            let thanks = sent.message ?? L("topics.sent")
            message = (true, thanks)
            UIAccessibility.post(notification: .announcement, argument: thanks)
        } catch {
            if case APIError.unauthorized? = error as? APIError { model.handle(error); dismiss(); return }
            if case let APIError.refused(_, sentence)? = error as? APIError {
                message = (false, sentence ?? L("topics.error.unavailable"))
            } else {
                message = (false, model.message(for: error))
            }
        }
    }

    private func withdraw(_ t: TopicRequest) async {
        let before = topics
        withAnimation { topics.removeAll { $0.id == t.id } }
        do {
            try await model.api.withdrawTopic(t.id)
        } catch {
            topics = before
            message = (false, model.message(for: error))
        }
    }
}

/// One suggestion: its text, what became of it, and Remove while it waits.
struct TopicRow: View {
    let topic: TopicRequest
    let withdraw: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: Theme.s3) {
            VStack(alignment: .leading, spacing: 2) {
                Text(topic.text)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(status)
                    .font(.footnote)
                    .foregroundStyle(topic.status == .refused ? Theme.amber : Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
                if topic.status == .refused, let r = topic.reason {
                    Text(Self.reason(r)).font(.footnote).foregroundStyle(Theme.body).fixedSize(horizontal: false, vertical: true)
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("topics.row")
            if topic.status == .pending {
                Button(action: withdraw) {
                    Image(systemName: "xmark")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Theme.muted)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(L("topics.withdraw")): \(topic.text)")
                .accessibilityIdentifier("topics.withdraw")
            }
        }
        .padding(.horizontal, Theme.s3)
        .padding(.vertical, Theme.s2)
        .frame(minHeight: 52)
    }

    private var status: String {
        switch topic.status {
        case .pending: return L("topics.status.pending")
        case .used:
            let s = L("topics.status.used")
            guard let w = topic.weekOf else { return s }
            return "\(s) · \(L("topics.usedIn", L10n.weekRange(w)))"
        case .refused, .unknown: return L("topics.status.refused")
        }
    }

    static func reason(_ r: TopicRefusal) -> String {
        switch r {
        case .notOffered: return L("topics.reason.not_offered")
        case .adRules: return L("topics.reason.ad_rules")
        case .clinical: return L("topics.reason.clinical")
        case .unclear: return L("topics.reason.unclear")
        case .checks: return L("topics.reason.checks")
        }
    }
}

/// "12/140": what has been typed against the limit.
struct CharCounter: View {
    let count: Int
    let max: Int

    var body: some View {
        Text(verbatim: "\(count)/\(max)")
            .font(.caption)
            .monospacedDigit()
            .foregroundStyle(count > max ? Theme.danger : Theme.muted)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .accessibilityLabel(L("requests.chars", count, max))
    }
}

// MARK: Change requests

/// "What should be different?": a note of 3 to 300 characters. Only this video is made again,
/// with the same checks, and the clinic approves it again before posting.
struct ChangeSheet: View {
    let item: VideoItem
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    @State private var busy = false
    @State private var error: String?
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {
                    Text(L("change.lead")).font(.body).foregroundStyle(Theme.body).fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text(L("change.label")).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                        TextField(L("change.placeholder"), text: $note, axis: .vertical)
                            .lineLimit(3...6)
                            .focused($focused)
                            .padding(14)
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous).strokeBorder(focused ? Theme.teal : Theme.line))
                            .onChange(of: note) { _, v in
                                let cut = RequestRules.limit(v, to: RequestRules.noteMax)
                                if cut != v { note = cut }
                            }
                            .accessibilityLabel(L("change.label"))
                            .accessibilityIdentifier("change.note")
                        CharCounter(count: RequestRules.length(note), max: RequestRules.noteMax)
                    }
                    if let error { ErrorBox(text: error, id: "change.error") }
                    Button {
                        Task { await send() }
                    } label: {
                        if busy {
                            HStack(spacing: Theme.s2) { ProgressView().tint(Theme.onFill); Text(L("change.sending")) }
                        } else {
                            Text(L("change.submit"))
                        }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(busy || !RequestRules.canSendNote(note))
                    .accessibilityIdentifier("change.submit")
                }
                .padding(Theme.s5)
                .readableWidth(560)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("change.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L("change.cancel")) { dismiss() }.accessibilityIdentifier("change.cancel")
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Theme.paper)
    }

    private func send() async {
        busy = true
        error = nil
        defer { busy = false }
        if let problem = await model.requestChange(item, note: note) {
            error = problem
            UIAccessibility.post(notification: .announcement, argument: problem)
        } else {
            dismiss()
        }
    }
}

/// The latest change of a video, as the web's card says it.
struct ChangeNote: View {
    let item: VideoItem

    var body: some View {
        if let note = RequestRules.note(for: item) {
            Group {
                switch note {
                case let .running(status):
                    Label(status == .working ? L("change.status.working") : L("change.status.queued"), systemImage: "pencil.and.outline")
                        .foregroundStyle(Theme.body)
                        .padding(Theme.s4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.sand, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                case .done:
                    Label(L("change.status.done"), systemImage: "checkmark.circle")
                        .foregroundStyle(Theme.teal)
                        .padding(Theme.s4)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Theme.teal.opacity(0.1), in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                case let .notChanged(reason):
                    VStack(alignment: .leading, spacing: Theme.s1) {
                        Text(item.change?.status == .failed ? L("change.status.failed") : L("change.status.refused")).font(.subheadline.weight(.semibold))
                        if let reason { Text(Self.reason(reason)).font(.subheadline) }
                    }
                    .foregroundStyle(Theme.amber)
                    .padding(Theme.s4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Theme.amberSoft, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                }
            }
            .font(.subheadline)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("change.state")
        }
    }

    static func reason(_ r: ChangeReason) -> String {
        switch r {
        case .checks: return L("change.reason.checks")
        case .noPlan: return L("change.reason.no_plan")
        case .busy: return L("change.reason.busy")
        case .technical: return L("change.reason.technical")
        case .notPossible: return L("change.reason.not_possible")
        }
    }
}

// MARK: Subtitles

/// "Download subtitles (.srt)": the narration, timed, for YouTube and Facebook. The file opens in
/// the share sheet (Save to Files, Mail, AirDrop…).
struct SubtitlesRow: View {
    let item: VideoItem
    @Environment(AppModel.self) private var model
    @State private var busy = false
    @State private var file: SharedFile?
    @State private var error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.s1) {
            Button {
                Task { await download() }
            } label: {
                HStack(spacing: Theme.s2) {
                    if busy { ProgressView() } else { Image(systemName: "captions.bubble").accessibilityHidden(true) }
                    Text(L("subtitles.download"))
                }
            }
            .buttonStyle(.dvQuiet)
            .disabled(busy)
            .accessibilityHint(L("subtitles.hint"))
            .accessibilityIdentifier("post.subtitles")
            Text(L("subtitles.hint")).font(.footnote).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
            if let error {
                Text(error).font(.footnote).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("post.subtitles.error")
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .sheet(item: $file) { f in
            ActivityView(items: [f.url])
                .presentationDetents([.medium, .large])
                .ignoresSafeArea()
        }
    }

    private func download() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            file = SharedFile(url: try await model.subtitlesFile(for: item))
        } catch {
            if case APIError.unauthorized? = error as? APIError { model.handle(error); return }
            self.error = model.isOffline || (error as? APIError) == .offline ? L("error.offline") : L("subtitles.error")
        }
    }
}

struct SharedFile: Identifiable {
    let url: URL
    var id: String { url.path }
}

/// The system share sheet for files (UIActivityViewController).
struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ c: UIActivityViewController, context: Context) {}
}
