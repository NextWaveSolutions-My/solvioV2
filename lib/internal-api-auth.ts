import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const INTERNAL_API_KEY = process.env.NEXTWAVECHATBOT_INTERNAL_API_KEY || "";

/**
 * Constant-time check of the x-internal-api-key header against
 * NEXTWAVECHATBOT_INTERNAL_API_KEY, for trusted machine-to-machine callers (e.g. n8n).
 */
export function hasValidInternalApiKey(req: NextRequest): boolean {
  const provided = req.headers.get("x-internal-api-key") || "";

  // TEMP DEBUG — remove after diagnosing the key mismatch.
  console.log("[internal-api-auth] received header:", JSON.stringify(provided));
  console.log("[internal-api-auth] expected env value:", JSON.stringify(INTERNAL_API_KEY));

  if (!INTERNAL_API_KEY) return false;

  const expected = Buffer.from(INTERNAL_API_KEY);
  const actual = Buffer.from(provided);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
