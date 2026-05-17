import Foundation
import RevenueCat

@MainActor
final class RevenueCatService: ObservableObject {
    static let shared = RevenueCatService()
    @Published var customerInfo: CustomerInfo?
    @Published var offerings: Offerings?

    var hasPro: Bool {
        customerInfo?.entitlements["pro"]?.isActive == true
        || customerInfo?.entitlements["agency"]?.isActive == true
    }
    var hasAnyPaid: Bool {
        guard let ents = customerInfo?.entitlements.active else { return false }
        return !ents.isEmpty
    }

    func identify(userId: String) async {
        do {
            let (info, _) = try await Purchases.shared.logIn(userId)
            self.customerInfo = info
            await refreshOfferings()
        } catch {
            print("RC identify error: \(error)")
        }
    }

    func refreshOfferings() async {
        do {
            self.offerings = try await Purchases.shared.offerings()
        } catch {
            print("RC offerings error: \(error)")
        }
    }

    func purchase(_ package: Package) async throws {
        let result = try await Purchases.shared.purchase(package: package)
        self.customerInfo = result.customerInfo
    }

    func restore() async throws {
        self.customerInfo = try await Purchases.shared.restorePurchases()
    }
}
