#!/bin/sh
# Archive DentVideo and upload it to App Store Connect with the team's App Store
# Connect API key (the ids live in ~/.config/dentvideo/asc.env, chmod 600; the .p8
# is never in git). Automatic signing creates the push + associated-domains
# profiles through the key. The app record com.bulsulabs.dentvideo must exist in
# App Store Connect first (otherwise: missingApp).
# Usage: ios/DentVideo/scripts/upload.sh [build-number]   (default: next number)
set -eu
cd "$(dirname "$0")/.."
. "${DV_ASC_ENV:-$HOME/.config/dentvideo/asc.env}"
CUR=$(sed -n 's/ *CFBundleVersion: "\([0-9]*\)"/\1/p' project.yml | head -1)
NEXT=${1:-$((CUR + 1))}
VER=$(sed -n 's/ *CFBundleShortVersionString: "\(.*\)"/\1/p' project.yml | head -1)
sed -i '' "s/CFBundleVersion: \"$CUR\"/CFBundleVersion: \"$NEXT\"/" project.yml
# Keep the new build number only if the upload succeeds.
trap '[ "${DONE:-0}" = 1 ] || sed -i "" "s/CFBundleVersion: \"$NEXT\"/CFBundleVersion: \"$CUR\"/" project.yml' EXIT
AUTH="-authenticationKeyPath $ASC_KEY_PATH -authenticationKeyID $ASC_KEY_ID -authenticationKeyIssuerID $ASC_ISSUER_ID"
xcodegen generate -q
ARCHIVE="build/DentVideo-$VER-$NEXT.xcarchive"
xcodebuild -project DentVideo.xcodeproj -scheme DentVideo -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" -allowProvisioningUpdates $AUTH archive
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist ../exportOptions.plist \
  -exportPath build/export -allowProvisioningUpdates $AUTH
DONE=1
echo "Uploaded DentVideo $VER ($NEXT)."
