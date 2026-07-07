import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import {
  createConversationRecord,
  createMessageRecord,
  serializeMessageDocument,
} from "@/lib/chat/server";
import {
  emitMessageCreated,
  emitConversationSummaryToParticipants,
} from "@/lib/socket/server";
import { hasValidInternalApiKey } from "@/lib/internal-api-auth";

const ADMIN_USER_ID = "6a3a3fa96ad62b76f6364720";
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || "";

export async function POST(req: NextRequest) {
  // Accept either the legacy bridge secret or the shared internal API key,
  // so existing n8n workflows keep working while new ones can move to the
  // unified key.
  const bridgeSecretHeader = req.headers.get("x-bridge-secret");
  const bridgeSecretValid =
    Boolean(BRIDGE_SECRET) && bridgeSecretHeader === BRIDGE_SECRET;

  if (!bridgeSecretValid && !hasValidInternalApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { phone, message, senderName } = body;

  if (!phone || !message) {
    return NextResponse.json(
      { error: "phone and message are required" },
      { status: 400 }
    );
  }

  const usersCollection = await getCollection("user");
  const conversationsCollection = await getCollection("conversations");

  const shadowEmail = `${phone}@whatsapp.local`;

  // 1. Find or note that shadow user doesn't exist yet
  let shadowUser = await usersCollection.findOne({ email: shadowEmail });
  let shadowUserId: string;

  if (!shadowUser) {
    return NextResponse.json(
      { error: "shadow_user_missing", shadowEmail },
      { status: 412 }
    );
  } else {
    shadowUserId = shadowUser._id.toString();
  }

  // 2. Find existing direct conversation between shadow user and admin
  let conversation = await conversationsCollection.findOne({
    type: "direct",
    participantIds: { $all: [shadowUserId, ADMIN_USER_ID] },
  });

  if (!conversation) {
    conversation = await createConversationRecord({
      participantIds: [shadowUserId, ADMIN_USER_ID],
      createdBy: shadowUserId,
    });
  }

// 3. Create the message
  const isFromAgent = body.fromAgent === true;
  const messageDoc = await createMessageRecord({
    conversationId: conversation.id,
    senderId: isFromAgent ? ADMIN_USER_ID : shadowUserId,
    senderName: isFromAgent ? "Andy" : (senderName || phone),
    content: message,
  });

  // 4. Emit live updates
  const serialized = serializeMessageDocument(messageDoc);
  emitMessageCreated(serialized);
  await emitConversationSummaryToParticipants(conversation.id);

  return NextResponse.json({ success: true, conversationId: conversation.id });
}
