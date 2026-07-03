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
