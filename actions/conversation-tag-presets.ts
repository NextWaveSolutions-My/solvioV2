"use server";

/**
 * Server Actions for Conversation Tag Presets
 *
 * Lets support/admin staff save a color-coded conversation tag (see
 * actions/conversation-tags.ts) so it can be picked from a list next
 * time instead of retyping the label and re-picking a color.
 */

import { randomUUID } from "crypto";
import { requireAdminOrSupport } from "@/lib/auth-utils";
import {
  createConversationTagPresetDocument,
  deleteConversationTagPresetDocument,
  findConversationTagPresetByLabel,
  getConversationTagPresetDocuments,
} from "@/lib/chat/server";
import { CONVERSATION_TAG_COLORS } from "@/lib/chat/conversation-tag-colors";
import type { ConversationTagColor, ConversationTagPreset } from "@/types/realtime";

const MAX_LABEL_LENGTH = 24;

function isValidColor(color: string): color is ConversationTagColor {
  return (CONVERSATION_TAG_COLORS as string[]).includes(color);
}

export async function getTagPresets(): Promise<{
  success: boolean;
  data?: ConversationTagPreset[];
  error?: string;
}> {
  try {
    await requireAdminOrSupport();
    const presets = await getConversationTagPresetDocuments();
    return { success: true, data: presets };
  } catch (error) {
    console.error("Error fetching tag presets:", error);
    return { success: false, error: "Failed to load tag presets" };
  }
}

export async function createTagPreset(
  label: string,
  color: string
): Promise<{ success: boolean; preset?: ConversationTagPreset; error?: string }> {
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

    const existing = await findConversationTagPresetByLabel(trimmedLabel);
    if (existing) {
      return { success: true, preset: existing };
    }

    const preset = await createConversationTagPresetDocument({
      id: randomUUID(),
      label: trimmedLabel,
      color,
      createdBy: session.user.id,
    });

    return { success: true, preset };
  } catch (error) {
    console.error("Error creating tag preset:", error);
    return { success: false, error: "Failed to create tag preset" };
  }
}

export async function deleteTagPreset(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminOrSupport();
    await deleteConversationTagPresetDocument(id);
    return { success: true };
  } catch (error) {
    console.error("Error deleting tag preset:", error);
    return { success: false, error: "Failed to delete tag preset" };
  }
}
