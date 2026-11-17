#!/usr/bin/env bash
# Best-effort TikTok handle check. Reads the public profile page, no login.
# statusCode 0 + uniqueId  = a public account exists (taken)
# statusCode 10221         = TikTok shows "Couldn't find this account" (probably free, see README caveats)
# anything else            = unknown, check by hand
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
for h in "${@:-dentvideo dentvideo.app dentvideo_app getdentvideo dentvideohq dentvideo.tr tiktok}"; do
  for x in $h; do
    page=$(curl -sS -L -A "$UA" --max-time 25 "https://www.tiktok.com/@$x")
    sc=$(grep -o '"statusCode":[0-9-]*' <<<"$page" | head -1 | cut -d: -f2)
    uid=$(grep -o '"uniqueId":"[^"]*"' <<<"$page" | head -1 | cut -d'"' -f4)
    case "$sc" in
      0) echo "@$x  TAKEN (public account @$uid)";;
      10221) echo "@$x  no account found (likely free)";;
      *) echo "@$x  unknown (statusCode=$sc)";;
    esac
  done
done
