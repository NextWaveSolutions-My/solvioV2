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

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<void> {
  try {
    await fetch(WAHA_BRIDGE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message }),
    });
  } catch (err) {
    console.error("Failed to notify WhatsApp bridge:", err);
  }
}
