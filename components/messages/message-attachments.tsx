"use client";

/**
 * Message Attachments Component
 *
 * Displays file attachments with preview and download
 */

import { deleteMessageAttachment } from "@/actions/message-attachments";
import { Button } from "@/components/ui/button";
import {
  FileIcon,
  Download,
  X,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import type { MessageAttachment } from "@/types/realtime";

interface MessageAttachmentsProps {
  currentUserId: string;
  uploadedBy: string;
  attachments: MessageAttachment[];
}

export function MessageAttachments({
  currentUserId,
  uploadedBy,
  attachments,
}: MessageAttachmentsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    if (isDeleting) return;
    setIsDeleting(true);
    const result = await deleteMessageAttachment(pendingDeleteId);
    if (result.success) {
      toast.success("Attachment deleted");
      setDeleteDialogOpen(false);
      setPendingDeleteId(null);
    } else {
      toast.error(result.error || "Failed to delete attachment");
    }
    setIsDeleting(false);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id}>
          {attachment.file_type === "image" && attachment.file_url && (
            <a
              href={attachment.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-1"
            >
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                className="max-w-[280px] rounded-lg"
              />
            </a>
          )}

          <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
            <div className="shrink-0">{getFileIcon(attachment.file_type)}</div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {attachment.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.file_size)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                <a
                  href={attachment.file_url}
                  download={attachment.file_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </a>
              </Button>

              {currentUserId === uploadedBy && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => {
                    setPendingDeleteId(attachment.id);
                    setDeleteDialogOpen(true);
                  }}
                  title="Delete"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
