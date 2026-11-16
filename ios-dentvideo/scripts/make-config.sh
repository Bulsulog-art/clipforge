#!/bin/sh
# Writes DentVideo/Config.swift (gitignored) from ~/.config/dentvideo/ios-public.env.
# The values are the same public URL + anon key the website ships to every browser;
# they stay out of git only so one file holds them.
set -eu
ENV_FILE="${DV_IOS_ENV:-$HOME/.config/dentvideo/ios-public.env}"
. "$ENV_FILE"
OUT="$(dirname "$0")/../DentVideo/Config.swift"
cat > "$OUT" <<SWIFT
import Foundation

enum Config {
    static let supabaseURL = URL(string: "$DV_SUPABASE_URL")!
    static let supabaseAnonKey = "$DV_SUPABASE_ANON"
    static let siteURL = URL(string: "https://dentvideo.com")!
}
SWIFT
echo "wrote $OUT"
