# ClipForge iOS

SwiftUI · iOS 17+ · RevenueCat · Supabase

## Generate Xcode project

```bash
# install xcodegen
brew install xcodegen
cd ios
xcodegen generate
open ClipForge.xcodeproj
```

## SDK versions
- RevenueCat: 5.x
- Supabase: 2.x
- swift-tools 5.10

Bundle ID: `com.bulsulabs.clipforge`

## Build & ship
```bash
# Archive
xcodebuild -scheme ClipForge -configuration Release archive \
  -archivePath build/ClipForge.xcarchive

# Export for App Store
xcodebuild -exportArchive \
  -archivePath build/ClipForge.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/
```

App Store Connect TestFlight'tan dağıtım.
