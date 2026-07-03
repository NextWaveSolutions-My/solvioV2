/**
 * Shared conversation tag color palette.
 *
 * Deliberately NOT in actions/conversation-tags.ts: that file has a
 * top-level "use server" directive, so Next.js rewrites every export
 * (including plain constants) into a server-reference RPC stub for
 * client bundles. Client components importing a non-function export
 * from a "use server" file get that stub instead of the real value,
 * so array methods like .map() fail at runtime. Keep this palette here
 * and import it from both the server actions and client components.
 */

import type { ConversationTagColor } from "@/types/realtime";

export const CONVERSATION_TAG_COLORS: ConversationTagColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "gray",
];
