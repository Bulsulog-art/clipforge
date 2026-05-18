#!/usr/bin/env tsx
/**
 * Send a test push to a specific user. Useful for verifying APNs setup
 * without going through a full render.
 *
 * Usage:
 *   pnpm tsx src/cli/send-test-push.ts <userId> "Title" "Body"
 *
 * Example:
 *   pnpm tsx src/cli/send-test-push.ts 1234-5678 "Hi 👋" "Your APNs key works."
 */
import { sendPush } from "../push.js";

async function main() {
  const [userId, title, body] = process.argv.slice(2);
  if (!userId || !title || !body) {
    console.error("Usage: send-test-push <userId> <title> <body>");
    process.exit(1);
  }

  await sendPush(userId, {
    title,
    body,
    data: { kind: "test", source: "cli" },
  });
  console.log("✓ push attempted for user", userId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
