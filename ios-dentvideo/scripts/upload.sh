#!/bin/sh
# Archive DentVideo and upload it to App Store Connect, the way ClipForge ships
# (ios/exportOptions.plist: automatic signing, destination upload). The app
# record com.bulsulabs.dentvideo must exist in App Store Connect first.
# Usage: scripts/upload.sh [build-number]   (default: the next number)
set -eu
# App Store Connect API key (same key ClipForge uploads with); ids in ~/.config, the .p8 is never in git.
. "${DV_ASC_ENV:-$HOME/.config/dentvideo/asc.env}"
AUTH="-authenticationKeyPath $ASC_KEY_PATH -authenticationKeyID $ASC_KEY_ID -authenticationKeyIssuerID $ASC_ISSUER_ID"
cd "$(dirname "$0")/.."
[ -f DentVideo/Config.swift ] || scripts/make-config.sh
CUR=$(sed -n 's/ *CFBundleVersion: "\([0-9]*\)"/\1/p' project.yml)
NEXT=${1:-$((CUR + 1))}
sed -i '' "s/CFBundleVersion: \"$CUR\"/CFBundleVersion: \"$NEXT\"/" project.yml
VER=$(sed -n 's/ *CFBundleShortVersionString: "\(.*\)"/\1/p' project.yml)
xcodegen generate -q
ARCHIVE="build/DentVideo-$VER-$NEXT.xcarchive"
xcodebuild -project DentVideo.xcodeproj -scheme DentVideo -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" -allowProvisioningUpdates $AUTH archive
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist exportOptions.plist \
  -exportPath build/export -allowProvisioningUpdates $AUTH
echo "Uploaded DentVideo $VER ($NEXT)."
