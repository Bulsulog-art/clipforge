import http2 from "node:http2";
import crypto from "node:crypto";
import { supabase } from "./supabase.js";
import { logger } from "./logger.js";

/**
 * Send a notification to all iOS push tokens for a user via APNs HTTP/2.
 *
 * Required env:
 *   APNS_KEY_ID           — Apple key id (e.g. "ABC123XYZ4")
 *   APNS_TEAM_ID          — Apple team id (e.g. "YA6Y85MSY6")
 *   APNS_KEY_P8           — APNs auth key contents (.p8 PEM) — *not* the App Store API key
 *   APNS_BUNDLE_ID        — "com.bulsulabs.clipforge"
 *   APNS_ENV              — "production" | "development" (default: development)
 *
 * To create the APNs auth key: developer.apple.com → Keys → "+ Apple Push Notifications service (APNs)"
 */
export async function sendPush(
  userId: string,
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  if (!process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID || !process.env.APNS_KEY_P8) {
    logger.warn("APNs env not configured — skipping push");
    return;
  }
  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);
  if (error || !tokens || tokens.length === 0) return;

  const jwt = buildApnsJwt();
  const host =
    process.env.APNS_ENV === "production"
      ? "api.push.apple.com"
      : "api.sandbox.push.apple.com";

  for (const row of tokens) {
    try {
      await deliver(host, row.token as string, jwt, payload);
    } catch (e) {
      logger.warn({ err: (e as Error).message, token: row.token }, "apns send failed");
    }
  }
}

function buildApnsJwt(): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: process.env.APNS_KEY_ID }));
  const body = base64url(
    JSON.stringify({ iss: process.env.APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }),
  );
  const signature = crypto
    .createSign("SHA256")
    .update(`${header}.${body}`)
    .sign({
      key: process.env.APNS_KEY_P8!.replace(/\\n/g, "\n"),
      dsaEncoding: "ieee-p1363",
    });
  return `${header}.${body}.${base64url(signature)}`;
}

function deliver(
  host: string,
  deviceToken: string,
  jwt: string,
  payload: { title: string; body: string; data?: Record<string, string> },
) {
  return new Promise<void>((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    const body = JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
        badge: 1,
      },
      ...(payload.data ?? {}),
    });
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      "apns-topic": process.env.APNS_BUNDLE_ID!,
      "apns-push-type": "alert",
      authorization: `bearer ${jwt}`,
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    });
    let status = 0;
    req.on("response", (h) => { status = Number(h[":status"] ?? 0); });
    req.on("error", (e) => { client.close(); reject(e); });
    req.on("end", () => {
      client.close();
      if (status >= 200 && status < 300) resolve();
      else reject(new Error(`apns ${status}`));
    });
    req.end(body);
  });
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
