/**
 * WhatsApp bridge helper
 *
 * Wraps the n8n/WAHA webhook used to push outbound WhatsApp messages. Same
 * endpoint and payload shape as the inline fetch call in
 * actions/messages.ts (sendMessage) — this is not a new WhatsApp
 * connection, just a shared call site so other features (e.g. service
 * bookings) don't have to duplicate the URL and error handling.
 */

const WAHA_BRIDGE_WEBHOOK_URL = "http://localhost:5678/webhook/solvio-to-waha";

/**
 * POSTs to an n8n/WAHA bridge webhook and throws if it didn't actually
 * succeed. fetch() only rejects on network failures, not HTTP error
 * statuses, so callers that skip the .ok check see a resolved promise
 * even when n8n/WAHA rejected the send (bad session, bad chatId, etc.).
 */
export async function postToWahaBridge(
  url: string,
  payload: Record<string, unknown>
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `WhatsApp bridge responded ${response.status} ${response.statusText}: ${body}`
    );
  }
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<void> {
  try {
    await postToWahaBridge(WAHA_BRIDGE_WEBHOOK_URL, { phone, message });
  } catch (err) {
    console.error("Failed to notify WhatsApp bridge:", err);
  }
}
