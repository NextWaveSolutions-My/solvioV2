"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tags, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { ConversationTagBadge } from "@/components/chat/conversation-tag-badge";
import {
  deleteTagPreset,
  getTagPresets,
} from "@/actions/conversation-tag-presets";
import type { ConversationTagPreset } from "@/types/realtime";

export function ConversationTagPresetsSettingsForm() {
  const [presets, setPresets] = useState<ConversationTagPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ConversationTagPreset | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getTagPresets();
      if (!result.success || !result.data) {
        setError(result.error || "Failed to load tag presets");
        setPresets([]);
      } else {
        setPresets(result.data);
      }
    } catch {
      setError("Failed to load tag presets");
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await deleteTagPreset(deleteTarget.id);
      if (result.success) {
        toast.success("Tag preset deleted");
        setDeleteTarget(null);
        await load();
      } else {
        toast.error(result.error || "Failed to delete tag preset");
      }
    } catch {
      toast.error("Failed to delete tag preset");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-lg border-0 p-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-rose-500/10">
            <Tags className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Conversation Tag Presets</CardTitle>
            <CardDescription className="mt-1">
              Saved labels that support staff can pick from when tagging a
              conversation, instead of typing one from scratch
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-6 pt-6">
        <div className="rounded-xl overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 bg-muted/20 hover:bg-muted/20">
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Tag
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Color
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-[100px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background/50">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Loading tag presets...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-destructive"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : presets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No saved tags yet. Tags typed into the conversation label
                    picker are saved here automatically.
                  </TableCell>
                </TableRow>
              ) : (
                presets.map((preset) => (
                  <TableRow
                    key={preset.id}
                    className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200"
                  >
                    <TableCell className="py-3.5 px-4">
                      <ConversationTagBadge
                        tag={{
                          id: preset.id,
                          label: preset.label,
                          color: preset.color,
                          created_at: preset.createdAt,
                          created_by: preset.createdBy,
                        }}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-muted-foreground capitalize">
                      {preset.color}
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(preset)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag preset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.label}
              </span>
              . It won&apos;t be removed from conversations already tagged
              with it, but staff won&apos;t be able to pick it from the saved
              list anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                void onConfirmDelete();
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
