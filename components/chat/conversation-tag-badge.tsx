/**
 * Conversation Tag Badge
 *
 * Small color-coded pill used to render conversation labels (e.g.
 * "URGENT", "VIP", "Payment Pending") in the conversation list and
 * chat header. Keep this palette in sync with CONVERSATION_TAG_COLORS
 * in lib/chat/conversation-tag-colors.ts.
 */

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { ConversationTag, ConversationTagColor } from "@/types/realtime";

export const TAG_COLOR_STYLES: Record<
  ConversationTagColor,
  { badge: string; dot: string }
> = {
  red: {
    badge:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
    dot: "bg-red-500",
  },
  orange: {
    badge:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
    dot: "bg-orange-500",
  },
  yellow: {
    badge:
      "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900",
    dot: "bg-yellow-500",
  },
  green: {
    badge:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-900",
    dot: "bg-green-500",
  },
  blue: {
    badge:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    dot: "bg-blue-500",
  },
  purple: {
    badge:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900",
    dot: "bg-purple-500",
  },
  pink: {
    badge:
      "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-900",
    dot: "bg-pink-500",
  },
  gray: {
    badge:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/60 dark:text-gray-300 dark:border-gray-800",
    dot: "bg-gray-500",
  },
};

interface ConversationTagBadgeProps {
  tag: ConversationTag;
  size?: "sm" | "xs";
  onRemove?: () => void;
  className?: string;
}

export function ConversationTagBadge({
  tag,
  size = "xs",
  onRemove,
  className,
}: ConversationTagBadgeProps) {
  const colorStyle = TAG_COLOR_STYLES[tag.color] || TAG_COLOR_STYLES.gray;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        size === "xs" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        colorStyle.badge,
        className
      )}
      title={tag.label}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", colorStyle.dot)} />
      {tag.label}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 -mr-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
          title={`Remove ${tag.label}`}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
