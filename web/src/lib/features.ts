/**
 * Posting clips to TikTok / Instagram / YouTube / X. Off: no platform OAuth
 * app is configured in production and no account has ever been connected
 * (checked 2026-11-16), so every "Post" / "Schedule" entry would sell a Plus
 * feature that cannot work. The iOS app has the same gate (FeatureGates.swift).
 */
export const SOCIAL_PUBLISHING = false;
