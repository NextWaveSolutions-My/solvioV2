/**
 * Conversation Tag Picker
 *
 * Popover that lets a support/admin agent color-code and label a
 * conversation (e.g. "URGENT", "VIP", "Payment Pending"). Opens from a
 * small tag icon on each conversation row in the inbox.
 */

"use client";

import { useState, useTransition } from "react";
import { Tag as TagIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  addConversationTag,
  removeConversationTag,
} from "@/actions/conversation-tags";
import { CONVERSATION_TAG_COLORS } from "@/lib/chat/conversation-tag-colors";
import {
  ConversationTagBadge,
  TAG_COLOR_STYLES,
} from "@/components/chat/conversation-tag-badge";
import type { ConversationTag, ConversationTagColor } from "@/types/realtime";

interface ConversationTagPickerProps {
  conversationId: string;
  tags: ConversationTag[];
  /** Show a text label next to the icon. Defaults to icon-only (used inline in the list row). */
  showLabel?: boolean;
  className?: string;
}

export function ConversationTagPicker({
  conversationId,
  tags,
  showLabel = false,
  className,
}: ConversationTagPickerProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [selectedColor, setSelectedColor] =
    useState<ConversationTagColor>("red");
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => {
    const trimmed = label.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await addConversationTag(
        conversationId,
        trimmed,
        selectedColor
      );
      if (result.success) {
        setLabel("");
      } else {
        toast.error(result.error || "Failed to add tag");
      }
    });
  };

  const handleRemove = (tagId: string) => {
    startTransition(async () => {
      const result = await removeConversationTag(conversationId, tagId);
      if (!result.success) {
        toast.error(result.error || "Failed to remove tag");
      }
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors",
            showLabel ? "px-2 py-1 text-xs" : "h-6 w-6 items-center justify-center",
            className
          )}
          title="Label conversation"
        >
          <TagIcon className="h-3.5 w-3.5" />
          {showLabel && <span>Label</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-semibold mb-2">Conversation labels</p>

        {/* Existing tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <ConversationTagBadge
                key={tag.id}
                tag={tag}
                onRemove={() => handleRemove(tag.id)}
              />
            ))}
          </div>
        )}

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 mb-2">
          {CONVERSATION_TAG_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className={cn(
                "h-5 w-5 rounded-full transition-transform",
                TAG_COLOR_STYLES[color].dot,
                selectedColor === color
                  ? "ring-2 ring-offset-2 ring-foreground/70 scale-105"
                  : "hover:scale-105"
              )}
              title={color}
            />
          ))}
        </div>

        {/* Label input + add button */}
        <div className="flex items-center gap-1.5">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. URGENT, VIP"
            maxLength={24}
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5"
            disabled={!label.trim() || isPending}
            onClick={handleAdd}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Add"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
