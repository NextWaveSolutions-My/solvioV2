# Solvio update: conversation tags + right-click "Create Ticket"

Two features, applied directly on top of your current codebase. Nothing here touches your Mongo data — the `tags` field just starts showing up as an empty array on existing conversations.

**Before you start:** commit or back up your current code (`git add -A && git commit -m "before tags/ticket feature"`, or just zip the folder). Then work through Part A, then Part B, in order.

---

## Part A — Create 5 new files

Copy each block below into a new file at the exact path shown.


### NEW FILE: `actions/conversation-tags.ts`

```ts
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
import { emitConversationSummaryToParticipants } from "@/lib/socket/server";
import type { ConversationTag, ConversationTagColor } from "@/types/realtime";

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
```


### NEW FILE: `components/chat/conversation-tag-badge.tsx`

```tsx
/**
 * Conversation Tag Badge
 *
 * Small color-coded pill used to render conversation labels (e.g.
 * "URGENT", "VIP", "Payment Pending") in the conversation list and
 * chat header. Keep this palette in sync with CONVERSATION_TAG_COLORS
 * in actions/conversation-tags.ts.
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
```


### NEW FILE: `components/chat/conversation-tag-picker.tsx`

```tsx
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
  CONVERSATION_TAG_COLORS,
} from "@/actions/conversation-tags";
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
```


### NEW FILE: `components/ui/context-menu.tsx`

```tsx
"use client"

import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  )
}

function ContextMenuGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return (
    <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />
  )
}

function ContextMenuPortal({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  return (
    <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
  )
}

function ContextMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        data-slot="context-menu-content"
        className={cn(
          "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-context-menu-content-available-height) min-w-[10rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
          className
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  )
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
}

function ContextMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...props}
    />
  )
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      className={cn(
        "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
}

function ContextMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.Label
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(
        "text-foreground px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function ContextMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn(
        "text-muted-foreground ml-auto text-xs tracking-widest",
        className
      )}
      {...props}
    />
  )
}

function ContextMenuSub({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />
}

function ContextMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </ContextMenuPrimitive.SubTrigger>
  )
}

function ContextMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg",
        className
      )}
      {...props}
    />
  )
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
}
```


### NEW FILE: `components/chat/create-ticket-from-message-dialog.tsx`

```tsx
/**
 * Create Ticket From Message Dialog
 *
 * Opened from the message right-click context menu. Pre-fills a ticket
 * with the message content so an agent can turn a customer complaint /
 * request coming through WhatsApp straight into a trackable ticket
 * without retyping anything.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Ticket as TicketIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateTicket } from "@/actions/admin";
import { getActiveTicketCategories } from "@/actions/ticket-categories";
import type { Message } from "@/types/realtime";
import type { Ticket, TicketPriority } from "@/types";

interface CreateTicketFromMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
  customerId: string | null;
  customerName?: string | null;
}

function buildDescription(message: Message) {
  const base = message.content?.trim() || "";
  const withContext = `Reported by customer via WhatsApp:\n\n"${base}"`;
  // adminCreateTicketSchema requires a 20-char minimum description, so pad
  // very short messages ("ok", "call me") with context instead of failing.
  return withContext.length >= 20 ? withContext : `${withContext}\n\n(Follow up needed.)`;
}

function buildTitle(message: Message) {
  const content = message.content?.trim() || "New request from WhatsApp";
  const truncated =
    content.length > 80 ? `${content.slice(0, 77)}...` : content;
  // adminCreateTicketSchema requires a 5-char minimum title.
  return truncated.length >= 5 ? truncated : `WhatsApp request: ${truncated}`;
}

export function CreateTicketFromMessageDialog({
  open,
  onOpenChange,
  message,
  customerId,
  customerName,
}: CreateTicketFromMessageDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  // Reset / pre-fill whenever a new message is targeted
  useEffect(() => {
    if (open && message) {
      setTitle(buildTitle(message));
      setDescription(buildDescription(message));
      setPriority("medium");
      setCreatedTicket(null);
    }
  }, [open, message]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingCategories(true);
    getActiveTicketCategories().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setCategories(
          result.data.map((c) => ({ value: c.slug, label: c.name }))
        );
        if (result.data[0]) setCategory((prev) => prev || result.data![0].slug);
      }
      setLoadingCategories(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!customerId) {
      toast.error("Couldn't identify the customer for this conversation");
      return;
    }
    if (title.trim().length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (description.trim().length < 20) {
      toast.error("Description must be at least 20 characters");
      return;
    }
    if (!category) {
      toast.error("Please choose a category");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await adminCreateTicket({
        customerId,
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
      });

      if (result.success && result.data) {
        setCreatedTicket(result.data);
        toast.success(`Ticket ${result.data.ticketNumber} created`);
      } else {
        toast.error(result.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket from message:", error);
      toast.error("Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {createdTicket ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Ticket created
              </DialogTitle>
              <DialogDescription>
                {createdTicket.ticketNumber} was created for{" "}
                {customerName || "this customer"}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button asChild>
                <Link href="/admin/tickets">View tickets</Link>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TicketIcon className="h-5 w-5" />
                Create ticket from message
              </DialogTitle>
              <DialogDescription>
                {customerName
                  ? `Creating a ticket for ${customerName}.`
                  : "Creating a ticket from this WhatsApp message."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ticket-title">Title</Label>
                <Input
                  id="ticket-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ticket-description">Description</Label>
                <Textarea
                  id="ticket-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  maxLength={5000}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingCategories ? "Loading..." : "Select category"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(value) =>
                      setPriority(value as TicketPriority)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!customerId && (
                <p className="text-xs text-destructive">
                  This conversation doesn&apos;t have a linked customer
                  account, so a ticket can&apos;t be created yet.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !customerId || loadingCategories}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create ticket
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Part B — Edit 6 existing files

For each file: find the "FIND" block in your file, and change it to match the "CHANGE TO" block. Only the highlighted lines are new — everything else stays the same, it's shown so you can locate the right spot.

### 1. `package.json`

Add one new dependency (next to your other `@radix-ui/react-*` packages):

**FIND:**
```json
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
```

**CHANGE TO:**
```json
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
```

Then run `npm install` after you're done editing all the files below.

---

### 2. `types/realtime.ts`

**FIND:**
```ts
export type ConversationType = "direct" | "group";
```

**CHANGE TO:**
```ts
export type ConversationType = "direct" | "group";

// Fixed color palette so tags always render consistently and stay
// accessible in both light/dark mode. Extend this list (and the matching
// map in conversation-tag-badge.tsx) if more colors are needed.
export type ConversationTagColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "gray";

export type ConversationTag = {
  id: string;
  label: string;
  color: ConversationTagColor;
  created_at: string;
  created_by: string;
};
```

Then further down, find the `Conversation` type:

**FIND:**
```ts
  updated_at: string;
  last_message_at: string | null;
  lastMessage?: ConversationMessageSummary | null;
};
```

**CHANGE TO:**
```ts
  updated_at: string;
  last_message_at: string | null;
  lastMessage?: ConversationMessageSummary | null;
  tags: ConversationTag[];
};
```

---

### 3. `lib/chat/server.ts`

**FIND** (near the top imports):
```ts
import type {
  ConversationMessageSummary,
  ConversationParticipantWithUser,
  ConversationType,
```

**CHANGE TO:**
```ts
import type {
  ConversationMessageSummary,
  ConversationParticipantWithUser,
  ConversationTag,
  ConversationType,
```

**FIND** (the `ConversationDocument` type):
```ts
  updatedAt: Date;
  lastMessageAt: Date | null;
  lastMessage: ConversationMessageSummary | null;
};
```

**CHANGE TO:**
```ts
  updatedAt: Date;
  lastMessageAt: Date | null;
  lastMessage: ConversationMessageSummary | null;
  tags?: ConversationTag[];
};
```

**FIND** (inside `serializeConversation`):
```ts
    participants,
    unreadCount,
  };
}
```

**CHANGE TO:**
```ts
    participants,
    unreadCount,
    tags: conversation.tags || [],
  };
}
```

**FIND** (the end of `getConversationSummariesForUser`):
```ts
  return conversations.map((conversation) =>
    serializeConversation(
      conversation,
      serializeConversationParticipants(conversation, usersMap),
      unreadMap.get(conversation.id) || 0
    )
  );
```

**CHANGE TO:**
```ts
  // Tags are an internal triage tool for staff (support/admin). Customers
  // viewing their own conversation shouldn't see internal labels like
  // "URGENT" or "VIP" attached to their chat.
  const viewerRole = usersMap.get(userId)?.role || "customer";
  const viewerIsStaff = viewerRole === "admin" || viewerRole === "support";

  return conversations.map((conversation) => {
    const summary = serializeConversation(
      conversation,
      serializeConversationParticipants(conversation, usersMap),
      unreadMap.get(conversation.id) || 0
    );
    return viewerIsStaff ? summary : { ...summary, tags: [] };
  });
```

**FIND** (near the very end of the file):
```ts
export async function serializeUsersByIds(userIds: string[]) {
  const usersMap = await getUsersMap(userIds);
  return Object.fromEntries(usersMap.entries());
}
```

**CHANGE TO** (keep that function, just add these two new ones right after it):
```ts
export async function serializeUsersByIds(userIds: string[]) {
  const usersMap = await getUsersMap(userIds);
  return Object.fromEntries(usersMap.entries());
}

// ---------------------------------------------------------------------------
// Conversation tags (color-coded labels like "URGENT", "VIP", "Follow up")
// ---------------------------------------------------------------------------

export async function addConversationTagToDocument(
  conversationId: string,
  tag: ConversationTag
) {
  const conversationsCollection =
    await getCollection<ConversationDocument>("conversations");

  await conversationsCollection.updateOne(
    { id: conversationId },
    {
      $push: { tags: tag },
      $set: { updatedAt: new Date() },
    }
  );

  return getConversationDocument(conversationId);
}

export async function removeConversationTagFromDocument(
  conversationId: string,
  tagId: string
) {
  const conversationsCollection =
    await getCollection<ConversationDocument>("conversations");

  await conversationsCollection.updateOne(
    { id: conversationId },
    {
      $pull: { tags: { id: tagId } },
      $set: { updatedAt: new Date() },
    }
  );

  return getConversationDocument(conversationId);
}
```

---

### 4. `components/chat/conversation-list.tsx`

**FIND** (imports):
```tsx
import { NameWithRole } from "@/components/shared/name-with-role";
import { useUserPresence } from "@/hooks/useUserPresence";
import type { ConversationWithParticipants } from "@/hooks/useRealtimeConversations";
import { Search, Users } from "lucide-react";
```

**CHANGE TO:**
```tsx
import { NameWithRole } from "@/components/shared/name-with-role";
import { useUserPresence } from "@/hooks/useUserPresence";
import type { ConversationWithParticipants } from "@/hooks/useRealtimeConversations";
import { Search, Users } from "lucide-react";
import { ConversationTagBadge } from "@/components/chat/conversation-tag-badge";
import { ConversationTagPicker } from "@/components/chat/conversation-tag-picker";
```

**FIND** (the props + component signature):
```tsx
interface ConversationListProps {
  userId: string;
  conversations: ConversationWithParticipants[];
  loading?: boolean;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string | null;
}

export function ConversationList({
  userId,
  conversations,
  loading = false,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const { isUserOnline } = useUserPresence(userId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
```

**CHANGE TO:**
```tsx
interface ConversationListProps {
  userId: string;
  userRole?: string;
  conversations: ConversationWithParticipants[];
  loading?: boolean;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string | null;
}

export function ConversationList({
  userId,
  userRole,
  conversations,
  loading = false,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const { isUserOnline } = useUserPresence(userId);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const canManageTags = userRole === "admin" || userRole === "support";
```

**FIND** (the row wrapper div — just adding one class):
```tsx
            <div
              key={conversation.id}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all",
```

**CHANGE TO:**
```tsx
            <div
              key={conversation.id}
              className={cn(
                "group/row flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer transition-all",
```

**FIND** (right after the last-message-preview block closes — look for the `</div>` right before `{/* Unread indicator dot */}`):
```tsx
                  )}
                </div>
              </div>

              {/* Unread indicator dot */}
```

**CHANGE TO:**
```tsx
                  )}
                </div>

                {/* Labels (color-coded tags) */}
                {(conversation.tags && conversation.tags.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {conversation.tags.map((tag) => (
                      <ConversationTagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                )}
              </div>

              {/* Tag picker trigger - visible on hover, or always if tags exist. Staff only. */}
              {canManageTags && (
                <div
                  className={cn(
                    "shrink-0 transition-opacity",
                    conversation.tags && conversation.tags.length > 0
                      ? "opacity-100"
                      : "opacity-0 group-hover/row:opacity-100"
                  )}
                >
                  <ConversationTagPicker
                    conversationId={conversation.id}
                    tags={conversation.tags || []}
                  />
                </div>
              )}

              {/* Unread indicator dot */}
```

---

### 5. `components/chat/messages-client.tsx`

**FIND:**
```tsx
            <ConversationList
              userId={userId}
              conversations={conversations}
```

**CHANGE TO:**
```tsx
            <ConversationList
              userId={userId}
              userRole={userRole}
              conversations={conversations}
```

**FIND:**
```tsx
                <MessageThread
                  conversationId={selectedConversationId}
                  userId={userId}
                  participants={selectedConversation?.participants}
                  onReplyToMessage={setReplyToMessage}
                />
```

**CHANGE TO:**
```tsx
                <MessageThread
                  conversationId={selectedConversationId}
                  userId={userId}
                  userRole={userRole}
                  participants={selectedConversation?.participants}
                  onReplyToMessage={setReplyToMessage}
                />
```

---

### 6. `components/chat/message-thread.tsx`

This one has the most changes because the message bubble needs to support right-click. Go slowly here.

**FIND** (imports):
```tsx
import { MoreVertical, Edit, Trash2, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

**CHANGE TO:**
```tsx
import { MoreVertical, Edit, Trash2, Reply, Ticket as TicketIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { CreateTicketFromMessageDialog } from "@/components/chat/create-ticket-from-message-dialog";
```

**FIND** (props + component signature):
```tsx
interface MessageThreadProps {
  conversationId: string;
  userId: string;
  participants?: ConversationParticipantWithUser[];
  onReplyToMessage?: (message: Message) => void;
}

export function MessageThread({
  conversationId,
  userId,
  participants,
  onReplyToMessage,
}: MessageThreadProps) {
```

**CHANGE TO:**
```tsx
interface MessageThreadProps {
  conversationId: string;
  userId: string;
  userRole?: string;
  participants?: ConversationParticipantWithUser[];
  onReplyToMessage?: (message: Message) => void;
}

export function MessageThread({
  conversationId,
  userId,
  userRole,
  participants,
  onReplyToMessage,
}: MessageThreadProps) {
```

**FIND** (right after `const [isDeleting, setIsDeleting] = useState(false);`):
```tsx
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-scroll to bottom when new messages arrive
```

**CHANGE TO:**
```tsx
  const [isDeleting, setIsDeleting] = useState(false);
  const [ticketMessage, setTicketMessage] = useState<Message | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  const canCreateTickets = userRole === "admin" || userRole === "support";
  // The conversation's customer — tickets are always filed against the
  // customer regardless of which message (theirs or the agent's) was
  // right-clicked.
  const customerParticipant = participants?.find(
    (p) => p.user_role === "customer"
  );

  // Auto-scroll to bottom when new messages arrive
```

**FIND** (right after `handleDeleteMessageConfirm` ends):
```tsx
    setIsDeleting(false);
  };

  if (loading) {
```

**CHANGE TO:**
```tsx
    setIsDeleting(false);
  };

  const handleCreateTicketFromMessage = (message: Message) => {
    setTicketMessage(message);
    setTicketDialogOpen(true);
  };

  if (loading) {
```

**Now the message bubble itself.** Find this whole block:
```tsx
              <div className="relative group/message">
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 wrap-break-word shadow-sm",
                    isOwnMessage
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-card border border-border/50 rounded-bl-md",
                    message.is_deleted && "opacity-60"
                  )}
                >
                  {!message.is_deleted && repliedToMessage && (
                    <div className="mb-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-background/40 border-l-2 border-border/70">
                      <p className="font-medium text-[10px] text-muted-foreground line-clamp-1">
                        {repliedToMessage.sender_name || "User"}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground/80">
                        {repliedToMessage.content || "[Attachment]"}
                      </p>
                    </div>
                  )}

                  {message.is_deleted ? (
                    <p className="italic text-xs">[Message deleted]</p>
                  ) : (
                    <>
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          <RichContent text={message.content} />
                        </p>
                      )}
                      {message.is_edited && (
                        <span className="text-[10px] opacity-60 ml-1">
                          (edited)
                        </span>
                      )}
                    </>
                  )}
                </div>
```

Replace that **entire block** with this:
```tsx
              <div className="relative group/message">
                {canCreateTickets ? (
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2 wrap-break-word shadow-sm",
                          isOwnMessage
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-card border border-border/50 rounded-bl-md",
                          message.is_deleted && "opacity-60"
                        )}
                      >
                        {!message.is_deleted && repliedToMessage && (
                          <div className="mb-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-background/40 border-l-2 border-border/70">
                            <p className="font-medium text-[10px] text-muted-foreground line-clamp-1">
                              {repliedToMessage.sender_name || "User"}
                            </p>
                            <p className="line-clamp-2 text-[11px] text-muted-foreground/80">
                              {repliedToMessage.content || "[Attachment]"}
                            </p>
                          </div>
                        )}

                        {message.is_deleted ? (
                          <p className="italic text-xs">[Message deleted]</p>
                        ) : (
                          <>
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                <RichContent text={message.content} />
                              </p>
                            )}
                            {message.is_edited && (
                              <span className="text-[10px] opacity-60 ml-1">
                                (edited)
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </ContextMenuTrigger>
                    {!message.is_deleted && (
                      <ContextMenuContent>
                        {onReplyToMessage && (
                          <ContextMenuItem
                            onSelect={() => onReplyToMessage(message)}
                          >
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </ContextMenuItem>
                        )}
                        <ContextMenuItem
                          onSelect={() => handleCreateTicketFromMessage(message)}
                        >
                          <TicketIcon className="h-4 w-4 mr-2" />
                          Create ticket
                        </ContextMenuItem>
                      </ContextMenuContent>
                    )}
                  </ContextMenu>
                ) : (
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 wrap-break-word shadow-sm",
                      isOwnMessage
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-card border border-border/50 rounded-bl-md",
                      message.is_deleted && "opacity-60"
                    )}
                  >
                    {!message.is_deleted && repliedToMessage && (
                      <div className="mb-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-background/40 border-l-2 border-border/70">
                        <p className="font-medium text-[10px] text-muted-foreground line-clamp-1">
                          {repliedToMessage.sender_name || "User"}
                        </p>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground/80">
                          {repliedToMessage.content || "[Attachment]"}
                        </p>
                      </div>
                    )}

                    {message.is_deleted ? (
                      <p className="italic text-xs">[Message deleted]</p>
                    ) : (
                      <>
                        {message.content && (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            <RichContent text={message.content} />
                          </p>
                        )}
                        {message.is_edited && (
                          <span className="text-[10px] opacity-60 ml-1">
                            (edited)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
```

(Everything below this — the reactions/reply/more-menu row — stays exactly as it was. You're only replacing the bubble `<div>` itself, not what comes after it.)

**Last edit in this file.** Find:
```tsx
      {/* Edit Message Dialog */}
      {editingMessage && (
        <MessageEditDialog
          message={editingMessage}
          open={!!editingMessage}
          onOpenChange={(open) => !open && setEditingMessage(null)}
          onSuccess={() => setEditingMessage(null)}
        />
      )}

      <AlertDialog
```

**CHANGE TO:**
```tsx
      {/* Edit Message Dialog */}
      {editingMessage && (
        <MessageEditDialog
          message={editingMessage}
          open={!!editingMessage}
          onOpenChange={(open) => !open && setEditingMessage(null)}
          onSuccess={() => setEditingMessage(null)}
        />
      )}

      {/* Create Ticket From Message Dialog */}
      {canCreateTickets && (
        <CreateTicketFromMessageDialog
          open={ticketDialogOpen}
          onOpenChange={(open) => {
            setTicketDialogOpen(open);
            if (!open) setTicketMessage(null);
          }}
          message={ticketMessage}
          customerId={customerParticipant?.user_id || null}
          customerName={customerParticipant?.user_name}
        />
      )}

      <AlertDialog
```

---

## Part C — Install and restart

```bash
cd solvio-app
npm install                 # pulls in @radix-ui/react-context-menu
npm run build                # optional but recommended: catches typos before you restart
pm2 restart solvio           # or however you currently restart your process (pm2 / systemd / npm run start)
```

If you're not using pm2, just stop and re-run whatever start command you normally use (`npm run start` or your systemd service restart).

---

## What to test after deploying

1. Open **Support Agent → Messages** (or Admin → Messages) logged in as a support/admin account.
2. Hover a conversation row → a small tag icon should appear on the right → click it → pick a color → type "URGENT" → Add. It should show up instantly under that conversation.
3. Log in as a customer and open their own messages — confirm the tag does **not** show (tags are staff-only, this is intentional).
4. Back in the staff view, right-click any message bubble in the thread → "Create ticket" → confirm the dialog pre-fills title/description → submit → check it shows up in Admin → Tickets.
