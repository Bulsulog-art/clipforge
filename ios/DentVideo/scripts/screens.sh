#!/bin/bash
# Screenshots of every DentVideo screen and state, from the simulator, in demo mode (DEBUG build,
# fake in-process API, the fictional "Sample Dental Practice" clinic; see App/Sources/Demo). Runs on macOS
# (CI: .github/workflows/ios-dentvideo.yml, job "screens"). Nothing here talks to a server.
#
# Usage: ios/DentVideo/scripts/screens.sh [out-dir]   (default: build/screens)
#   SCREENS_SET=full|medium|quick|iap   quick = a handful of screens; medium = English in full plus
#   the key screens in de, ar, ja, dark and the largest text size (no iPad); iap = sign-up and
#   purchase screens in English and Turkish
#
# Output:
#   <out>/review/<device>/<variant>/<screen>.jpg   half size, for looking at
#   <out>/store/<device>/<lang>/<screen>.png        full size, for the App Store set
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-build/screens}
SET=${SCREENS_SET:-full}
BUNDLE=com.bulsulabs.dentvideo
mkdir -p "$OUT/review" "$OUT/store"

pick() { # first available simulator whose name matches one of the arguments
  local list; list=$(xcrun simctl list devices available -j)
  for name in "$@"; do
    local id; id=$(echo "$list" | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices']
rts=sorted(d.keys(), reverse=True)
for rt in rts:
    for x in d[rt]:
        if x['name']=='$name' and 'iOS' in rt: print(x['udid']); sys.exit()
")
    if [ -n "$id" ]; then echo "$id|$name"; return; fi
  done
}

PHONE=$(pick "iPhone 17 Pro Max" "iPhone 16 Pro Max" "iPhone 16 Plus")
PAD=$(pick "iPad Pro 13-inch (M5)" "iPad Pro 13-inch (M4)" "iPad Pro (12.9-inch) (6th generation)")
[ -n "$PHONE" ] || { echo "no iPhone simulator"; xcrun simctl list devices available; exit 1; }
PHONE_ID=${PHONE%%|*}; PAD_ID=${PAD%%|*}
echo "iPhone: ${PHONE#*|}  iPad: ${PAD#*|}"

# One build, for the simulator (Debug: the demo code exists only there).
xcodebuild build -project DentVideo.xcodeproj -scheme DentVideo -configuration Debug \
  -destination "id=$PHONE_ID" -derivedDataPath build/DerivedData CODE_SIGNING_ALLOWED=NO -quiet
APP=$(find build/DerivedData/Build/Products -maxdepth 2 -name "DentVideo.app" -path "*iphonesimulator*" | head -1)
[ -d "$APP" ] || { echo "app not built"; exit 1; }

ALL=(signin signin-error signin-loading forgot loading offline-first noplan paused noclinic primer
     week week-full week-empty week-generating week-delayed week-offline approve-all
     video-review video-look video-approved video-posted video-declined decline post post-ready
     record record-locked camera-live camera-denied
     settings settings-bottom clinic videos delete signout
     signup signup-code verify paywall paywall-unavailable activating confirming settings-appstore)
KEY=(signin signin-error noplan week week-full week-generating week-delayed week-offline approve-all
     video-review video-look video-approved decline post-ready record camera-live settings settings-bottom videos delete)
AX=(signin week video-look post-ready record settings videos delete)
# Full-size PNGs: the six App Store screens (scripts/appstore_shots.py) and the paywall, which is
# not one of the six (the store set is for clinics) but is the in-app purchase's review screenshot
# in App Store Connect (docs/APP_STORE_DENTVIDEO.md §6).
STORE=(week-full video-review post-ready camera-live record videos paywall)
QUICK=(signin week video-look post-ready record settings)
# Sign-up and in-app purchase: the new account's screens (noclinic = the clinic form) and the plan in Settings.
IAP=(signin signup signup-code noclinic verify paywall paywall-unavailable activating confirming noplan settings settings-appstore)

locale_of() {
  case $1 in en) echo en_US;; tr) echo tr_TR;; de) echo de_DE;; es) echo es_ES;; fr) echo fr_FR;;
    ja) echo ja_JP;; ar) echo ar_SA;; pl) echo pl_PL;; esac
}

boot() {
  local id=$1
  xcrun simctl boot "$id" 2>/dev/null || true
  xcrun simctl bootstatus "$id" -b >/dev/null
  xcrun simctl install "$id" "$APP"
  xcrun simctl status_bar "$id" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
    --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100 || true
  # Warm-up launch: the first start after install is slow.
  xcrun simctl launch "$id" "$BUNDLE" -DVScreen week >/dev/null; sleep 6
}

shot() { # device-id device-label variant lang screen [store]
  local id=$1 dev=$2 variant=$3 lang=$4 s=$5 store=${6:-}
  xcrun simctl launch --terminate-running-process "$id" "$BUNDLE" \
    -AppleLanguages "($lang)" -AppleLocale "$(locale_of "$lang")" -DVScreen "$s" >/dev/null
  # Screens pushed or presented after the first load need longer, or the shot shows the screen
  # underneath (seen: "videos" captured as Settings in tr, es, pl).
  case $s in clinic|videos|delete|signout|settings-bottom|forgot|signup|signup-code) sleep 4.5;; *) sleep 2.2;; esac
  mkdir -p "$OUT/review/$dev/$variant"
  local png="$OUT/review/$dev/$variant/$s.png"
  xcrun simctl io "$id" screenshot --type=png "$png" >/dev/null 2>&1
  if [ -n "$store" ]; then mkdir -p "$OUT/store/$dev/$lang"; cp "$png" "$OUT/store/$dev/$lang/$s.png"; fi
  sips -Z 1434 -s format jpeg -s formatOptions 72 "$png" --out "${png%.png}.jpg" >/dev/null && rm "$png"
}

in_list() { local x=$1; shift; for y in "$@"; do [ "$x" = "$y" ] && return 0; done; return 1; }

variant() { # id dev appearance size lang screens...
  local id=$1 dev=$2 look=$3 size=$4 lang=$5; shift 5
  xcrun simctl ui "$id" appearance "$look"
  xcrun simctl ui "$id" content_size "$size"
  local v="$lang-$look"; [ "$size" != "large" ] && v="$v-ax5"
  for s in "$@"; do
    local store=""
    if [ "$look" = light ] && [ "$size" = large ] && in_list "$s" "${STORE[@]}"; then store=1; fi
    shot "$id" "$dev" "$v" "$lang" "$s" "$store"
  done
  echo "  $dev $v: $# screens"
}

START=$(date +%s)
boot "$PHONE_ID"
if [ "$SET" = iap ]; then
  variant "$PHONE_ID" phone light large en "${IAP[@]}"
  variant "$PHONE_ID" phone light large tr "${IAP[@]}"
  variant "$PHONE_ID" phone dark large en paywall
  variant "$PHONE_ID" phone light large ar paywall
elif [ "$SET" = quick ]; then
  variant "$PHONE_ID" phone light large en "${QUICK[@]}"
  variant "$PHONE_ID" phone dark large en "${QUICK[@]}"
  variant "$PHONE_ID" phone light large ar "${QUICK[@]}"
elif [ "$SET" = medium ]; then
  variant "$PHONE_ID" phone light large en "${ALL[@]}"
  variant "$PHONE_ID" phone dark large en "${KEY[@]}"
  for l in de ar ja; do variant "$PHONE_ID" phone light large "$l" "${KEY[@]}"; done
  variant "$PHONE_ID" phone light accessibility-extra-extra-extra-large en "${AX[@]}"
else
  variant "$PHONE_ID" phone light large en "${ALL[@]}"
  variant "$PHONE_ID" phone dark large en "${ALL[@]}"
  variant "$PHONE_ID" phone light large tr "${ALL[@]}"
  variant "$PHONE_ID" phone dark large tr "${KEY[@]}"
  for l in de es fr ja ar pl; do variant "$PHONE_ID" phone light large "$l" "${KEY[@]}"; done
  variant "$PHONE_ID" phone light accessibility-extra-extra-extra-large en "${AX[@]}"
fi
xcrun simctl ui "$PHONE_ID" content_size large
xcrun simctl shutdown "$PHONE_ID" || true

if [ -n "$PAD_ID" ] && [ "$SET" = full ]; then
  boot "$PAD_ID"
  variant "$PAD_ID" ipad light large en signin week-full video-review video-look post-ready record camera-live settings videos
  xcrun simctl shutdown "$PAD_ID" || true
fi
echo "screenshots done in $(( $(date +%s) - START ))s"
find "$OUT" -type f | wc -l
