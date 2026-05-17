import SwiftUI
import RevenueCatUI

struct PaywallView: View {
    var body: some View {
        PaywallViewWrapper()
            .ignoresSafeArea()
    }
}

// RevenueCatUI provides a SwiftUI Paywall that reads the configured offering.
struct PaywallViewWrapper: View {
    var body: some View {
        RevenueCatUI.PaywallView(displayCloseButton: true)
    }
}
