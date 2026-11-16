#!/bin/sh
# Creates the App Review demo clinic on Liman (docs/APP_STORE_DENTVIDEO.md §1.5). Owner runs it once,
# AFTER the worker with review_demo (getsWeeks) is deployed. Idempotent? No: run once; the second run
# stops at "user create failed" (email exists).
#   ~/.config/dentvideo/inceleme-demo.env (chmod 600) holds DENTVIDEO_REVIEW_PASSWORD; it is sent
#   over ssh stdin and never printed. No paid API is called: the videos are the site's English samples.
set -eu
cd "$(dirname "$0")/../.."
ENV="${DV_DEMO_ENV:-$HOME/.config/dentvideo/inceleme-demo.env}"
SSH="ssh -i $HOME/.ssh/liman_automation root@liman.bulsulabs.com"
$SSH 'rm -rf /root/dv-demo-tmp && mkdir -m 700 /root/dv-demo-tmp'
scp -q -i "$HOME/.ssh/liman_automation" scripts/dentvideo-review-demo/seed-on-liman.sh scripts/dentvideo-review-demo/items.json \
  supabase/liman/0024_dentvid_review_demo.sql web/public/dentvideo/samples/en/*.mp4 web/public/dentvideo/samples/en/*.jpg \
  root@liman.bulsulabs.com:/root/dv-demo-tmp/
sed -n 's/^DENTVIDEO_REVIEW_PASSWORD=//p' "$ENV" | $SSH 'bash /root/dv-demo-tmp/seed-on-liman.sh; rc=$?; rm -rf /root/dv-demo-tmp; exit $rc'
