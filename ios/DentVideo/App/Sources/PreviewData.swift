import Foundation
import DentVideoCore

/// Mock data for previews and App Store screenshots. Neutral sample clinic; no real people.
enum PreviewData {
    static let week = "2026-11-16"
    static let profile = ClinicProfile(name: "Sample Dental Practice", city: "Berlin", country: "DE", language: "en", services: ["Implants", "Whitening", "Aligners"], tone: "warm", address: "formal", narratorVoice: "female")
    static let plan = PlanInfo(state: .active, tier: "practice", canMake: true, adminPaused: false, recordings: true, renewsAt: nil)

    static let card = ShootCard(opening: "Hi, I'm Dr. Weber. Here is the one question patients ask most about whitening.", points: ["Whitening is safe on healthy enamel", "Sensitivity can happen and fades in a few days", "Ask us which method suits your teeth"], closing: "Book a check-up and we'll tell you what's realistic for you.", avoid: ["Promising a shade", "Before/after claims"], setup: ["Phone at eye level", "Light in front of you", "Quiet room"], minutes: 2)

    static let items: [VideoItem] = [
        VideoItem(id: "p1", status: .ready, approval: .pending, title: "How long does whitening last?", weekOf: week, caption: "Whitening is not forever, and that is normal. Here is what changes the result.", hashtags: ["dentist", "whitening", "smile"], slot: Slot(date: "2026-11-16", time: "19:00")),
        VideoItem(id: "p2", status: .flagged, approval: .pending, title: "Implants or a bridge?", weekOf: week, caption: "Two good options, two different jobs.", hashtags: ["implants"], reasons: [.pause], slot: Slot(date: "2026-11-17", time: "12:30")),
        VideoItem(id: "p3", status: .ready, approval: .approved, title: "Flossing in two minutes", weekOf: week, caption: "Once a day is enough. This is how.", hashtags: ["floss"], slot: Slot(date: "2026-11-18", time: "19:00")),
        VideoItem(id: "p4", status: .ready, approval: .approved, title: "Why your gums bleed", weekOf: week, caption: "Bleeding gums are a signal, not a normal part of brushing.", hashtags: ["gums"], postedAt: "2026-11-16T18:10:00Z", slot: Slot(date: "2026-11-19", time: "12:30")),
        VideoItem(id: "p5", status: .working, approval: .pending, title: "Aligners: what to expect", weekOf: week, shootCard: card),
        VideoItem(id: "p6", status: .ready, approval: .approved, title: "Sensitive teeth after cold drinks", weekOf: "2026-11-09", postedAt: "2026-11-10T11:00:00Z", slot: Slot(date: "2026-11-10", time: "12:30"), shootCard: card),
    ]

    final class EmptyStore: TokenStore, @unchecked Sendable {
        func load() -> Tokens? { nil }
        func save(_ tokens: Tokens?) {}
    }

    struct OfflineTransport: HTTPTransport {
        func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) { throw APIError.offline }
    }
}
