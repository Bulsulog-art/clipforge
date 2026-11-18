#!/bin/bash
# The RevenueCat public Apple SDK key (appl_…) for a build. It is public by design (it ships inside
# every copy of the app), but it is kept out of the repository: Config/RevenueCat.xcconfig is
# gitignored and written here from the environment variable REVENUECAT_PUBLIC_KEY.
# Without the key the paywall says "not available yet", so a release must never be built without it.
#
# Usage (from anywhere):
#   REVENUECAT_PUBLIC_KEY=appl_… scripts/revenuecat_key.sh write
#       Validates the key and writes Config/RevenueCat.xcconfig. Exits 1 when it is missing or
#       does not look like an Apple public SDK key.
#   REVENUECAT_PUBLIC_KEY=appl_… scripts/revenuecat_key.sh check <path/to/DentVideo.app>
#       Exits 1 unless the built app's Info.plist carries exactly that key (DVRevenueCatKey).
#
# Used by .github/workflows/ios-dentvideo-release.yml (the real key, repository secret
# REVENUECAT_PUBLIC_KEY) and by ios-dentvideo.yml (a dummy key, to prove the path on every CI run).
# The key is never printed in full.
set -euo pipefail
cd "$(dirname "$0")/.."
KEY=${REVENUECAT_PUBLIC_KEY:-}
KEY=$(printf '%s' "$KEY" | tr -d '[:space:]')

fail() { echo "::error::$1"; exit 1; }
shown() { printf '%s…(%d characters)' "${KEY:0:5}" "${#KEY}"; }

case "${1:-}" in
  write)
    [ -n "$KEY" ] || fail "REVENUECAT_PUBLIC_KEY is empty. Add the repository secret REVENUECAT_PUBLIC_KEY (RevenueCat → Project → API keys → the App Store app's public key, appl_…), see docs/APP_STORE_DENTVIDEO.md §1.6. Without it the paywall says \"not available yet\"."
    # Letters, digits and underscores only: anything else (a secret sk_ key, a Stripe strp_ key, a
    # test_ key, a pasted quote or "//", which starts a comment in an xcconfig) is refused.
    [[ "$KEY" =~ ^appl_[A-Za-z0-9_]{8,}$ ]] || fail "REVENUECAT_PUBLIC_KEY is not an App Store public SDK key (expected appl_ followed by letters and digits, got $(shown))."
    mkdir -p Config
    printf '// Written by scripts/revenuecat_key.sh. Gitignored; never commit.\nREVENUECAT_PUBLIC_KEY = %s\n' "$KEY" > Config/RevenueCat.xcconfig
    echo "Config/RevenueCat.xcconfig written ($(shown))."
    ;;
  check)
    APP=${2:?path to DentVideo.app}
    PLIST="$APP/Info.plist"
    [ -f "$PLIST" ] || fail "No Info.plist at $PLIST"
    GOT=$(/usr/libexec/PlistBuddy -c "Print :DVRevenueCatKey" "$PLIST" 2>/dev/null || true)
    [ -n "$KEY" ] || fail "REVENUECAT_PUBLIC_KEY is empty, nothing to compare."
    [ "$GOT" = "$KEY" ] || fail "The built app does not carry the RevenueCat key (DVRevenueCatKey is \"${GOT:0:5}…\", ${#GOT} characters). The paywall would say \"not available yet\"."
    echo "The built app carries the RevenueCat key ($(shown))."
    ;;
  *)
    echo "usage: $0 write | check <DentVideo.app>"; exit 2 ;;
esac
