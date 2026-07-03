"use server";

/**
 * Server Actions for Conversation Tags
 *
 * Lets support/admin staff attach color-coded labels (e.g. "URGENT",
 * "VIP", "Payment Pending") to a WhatsApp / chat conversation so it's
 * easy to scan the inbox and triage. Tags are staff-only — customers
 * never see or manage them.
 */

import { randomUUID } from "crypto";
import { requireAdminOrSupport } from "@/lib/auth-utils";
import {
  addConversationTagToDocument,
  getConversationDocument,
  removeConversationTagFromDocument,
} from "@/lib/chat/server";
import { CONVERSATION_TAG_COLORS } from "@/lib/chat/conversation-tag-colors";
import { emitConversationSummaryToParticipants } from "@/lib/socket/server";
import type { ConversationTag, ConversationTagColor } from "@/types/realtime";

const MAX_TAGS_PER_CONVERSATION = 8;
const MAX_LABEL_LENGTH = 24;

function isValidColor(color: string): color is ConversationTagColor {
  return (CONVERSATION_TAG_COLORS as string[]).includes(color);
}

export async function addConversationTag(
  conversationId: string,
  label: string,
  color: string
): Promise<{ success: boolean; tag?: ConversationTag; error?: string }> {
  try {
    const session = await requireAdminOrSupport();

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      return { success: false, error: "Label is required" };
    }
    if (trimmedLabel.length > MAX_LABEL_LENGTH) {
      return {
        success: false,
        error: `Label must be ${MAX_LABEL_LENGTH} characters or less`,
      };
    }
    if (!isValidColor(color)) {
      return { success: false, error: "Invalid color" };
    }

    // Staff don't have to be a participant of the conversation to tag it
    // (e.g. a supervisor triaging the shared inbox), so we only check the
    // conversation actually exists.
    const conversation = await getConversationDocument(conversationId);
    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const existingTags = conversation.tags || [];
    if (existingTags.length >= MAX_TAGS_PER_CONVERSATION) {
      return {
        success: false,
        error: `You can add up to ${MAX_TAGS_PER_CONVERSATION} tags per conversation`,
      };
    }
    const duplicate = existingTags.some(
      (tag) => tag.label.toLowerCase() === trimmedLabel.toLowerCase()
    );
    if (duplicate) {
      return { success: false, error: "This tag already exists" };
    }

    const tag: ConversationTag = {
      id: randomUUID(),
      label: trimmedLabel,
      color,
      created_at: new Date().toISOString(),
      created_by: session.user.id,
    };

    await addConversationTagToDocument(conversationId, tag);
    await emitConversationSummaryToParticipants(conversationId);

    return { success: true, tag };
  } catch (error) {
    console.error("Error adding conversation tag:", error);
    return { success: false, error: "Failed to add tag" };
  }
}

export async function removeConversationTag(
  conversationId: string,
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminOrSupport();

    await removeConversationTagFromDocument(conversationId, tagId);
    await emitConversationSummaryToParticipants(conversationId);

    return { success: true };
  } catch (error) {
    console.error("Error removing conversation tag:", error);
    return { success: false, error: "Failed to remove tag" };
  }
}
