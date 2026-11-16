// swift-tools-version: 6.0
import PackageDescription

// DentVideo's business logic, free of UIKit/SwiftUI so it builds and tests on macOS AND Linux
// (`swift test` in this folder). The iPhone app (../App) depends on it.
let package = Package(
    name: "DentVideoCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "DentVideoCore", targets: ["DentVideoCore"])],
    targets: [
        .target(name: "DentVideoCore"),
        .testTarget(name: "DentVideoCoreTests", dependencies: ["DentVideoCore"], resources: [.copy("Fixtures")]),
    ],
    swiftLanguageModes: [.v6]
)
