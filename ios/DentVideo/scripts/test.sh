#!/bin/bash
# Unit + end-to-end UI tests of the DentVideo app on one simulator.
# Usage: ios/DentVideo/scripts/test.sh "<device name>" <iOS major>   e.g. "iPhone SE (3rd generation)" 17
# The simulator is created when the runner has the runtime but no such device. The UI tests run the
# app in demo flow mode (in-process fake API; DEBUG only), see Tests/UI.
set -euo pipefail
cd "$(dirname "$0")/.."
DEVICE=${1:?device name}
MAJOR=${2:?iOS major version}

RUNTIME=$(xcrun simctl list runtimes -j | python3 -c "
import json,sys
rts=[r for r in json.load(sys.stdin)['runtimes'] if r['platform']=='iOS' and r['isAvailable'] and r['version'].split('.')[0]=='$MAJOR']
rts.sort(key=lambda r:[int(x) for x in r['version'].split('.')])
print(rts[-1]['identifier'] if rts else '')")
[ -n "$RUNTIME" ] || { echo "No iOS $MAJOR runtime on this runner"; xcrun simctl list runtimes; exit 1; }
UDID=$(xcrun simctl list devices available -j | python3 -c "
import json,sys
d=json.load(sys.stdin)['devices'].get('$RUNTIME',[])
print(next((x['udid'] for x in d if x['name']=='$DEVICE'),''))")
if [ -z "$UDID" ]; then
  TYPE=$(xcrun simctl list devicetypes -j | python3 -c "
import json,sys
print(next((t['identifier'] for t in json.load(sys.stdin)['devicetypes'] if t['name']=='$DEVICE'),''))")
  [ -n "$TYPE" ] || { echo "Unknown device type: $DEVICE"; exit 1; }
  UDID=$(xcrun simctl create "DV $DEVICE" "$TYPE" "$RUNTIME")
fi
echo "Testing on $DEVICE, $RUNTIME ($UDID)"
# The software keyboard, as on a phone (a connected Mac keyboard hides it and can steal focus).
defaults write com.apple.iphonesimulator ConnectHardwareKeyboard -bool false || true
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null

mkdir -p build
set +e
xcodebuild test -project DentVideo.xcodeproj -scheme DentVideo -configuration Debug \
  -destination "id=$UDID" -derivedDataPath build/DerivedDataTests \
  -resultBundlePath build/Tests.xcresult \
  -parallel-testing-enabled NO -retry-tests-on-failure -test-iterations 2 \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tee build/test.log | grep -E "error:|Test Case .*(passed|failed)|Executed|TEST (SUCCEEDED|FAILED)|\*\* " 
STATUS=${PIPESTATUS[0]}
set -e
echo "--- summary"
grep -E "Executed [0-9]+ tests" build/test.log | tail -2 || true
grep -E "Test Case .*failed" build/test.log | sort -u || true
exit $STATUS
