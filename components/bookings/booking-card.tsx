"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  User as UserIcon,
  Wrench,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { BookingFormDialog } from "@/components/bookings/booking-form-dialog";
import {
  cancelServiceBooking,
  completeServiceBooking,
  confirmServiceBooking,
} from "@/actions/service-bookings";
import type { ServiceBookingStatus } from "@/types";

export interface BookingCardData {
  _id: string;
  ticketId: string;
  customerName: string;
  phone: string;
  address: string;
  serviceType: string;
  scheduledAt: string;
  status: ServiceBookingStatus;
}

interface BookingCardProps {
  booking: BookingCardData;
}

function getStatusBadge(status: ServiceBookingStatus) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "confirmed":
      return (
        <Badge variant="info">
          <CalendarClock className="mr-1 h-3 w-3" />
          Confirmed
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="success">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Cancelled
        </Badge>
      );
  }
}

function getFormattedScheduledAt(scheduledAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(scheduledAt));
}

export function BookingCard({ booking }: BookingCardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleConfirm = async () => {
    setIsUpdating(true);
    const result = await confirmServiceBooking(booking._id);
    if (result.success) {
      toast.success("Booking confirmed — customer notified on WhatsApp");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to confirm booking");
    }
    setIsUpdating(false);
  };

  const handleComplete = async () => {
    setIsUpdating(true);
    const result = await completeServiceBooking(booking._id);
    if (result.success) {
      toast.success("Booking marked as completed");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update booking");
    }
    setIsUpdating(false);
  };

  const handleCancel = async () => {
    setIsUpdating(true);
    const result = await cancelServiceBooking(booking._id);
    if (result.success) {
      toast.success("Booking cancelled");
      setShowCancelDialog(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to cancel booking");
    }
    setIsUpdating(false);
  };

  const canReschedule = booking.status === "pending" || booking.status === "confirmed";
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{booking.serviceType}</span>
            </div>
            {getStatusBadge(booking.status)}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center">
              <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <span>{getFormattedScheduledAt(booking.scheduledAt)}</span>
            </div>
            <div className="flex items-center">
              <UserIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <span>{booking.customerName}</span>
            </div>
            <div className="flex items-center">
              <Phone className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
              <span>{booking.phone}</span>
            </div>
            <div className="flex items-start">
              <MapPin className="mr-2 h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{booking.address}</span>
            </div>
          </div>

          {(canReschedule || canCancel) && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {booking.status === "pending" && (
                <Button size="sm" onClick={handleConfirm} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  Confirm
                </Button>
              )}
              {booking.status === "confirmed" && (
                <Button size="sm" onClick={handleComplete} disabled={isUpdating}>
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  Mark Completed
                </Button>
              )}
              {canReschedule && (
                <BookingFormDialog
                  ticketId={booking.ticketId}
                  booking={booking}
                  trigger={
                    <Button size="sm" variant="outline" disabled={isUpdating}>
                      <CalendarClock className="mr-2 h-3.5 w-3.5" />
                      Reschedule
                    </Button>
                  }
                />
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isUpdating}
                >
                  <XCircle className="mr-2 h-3.5 w-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the {booking.serviceType} booking for{" "}
              {booking.customerName} on {getFormattedScheduledAt(booking.scheduledAt)}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isUpdating}
              onClick={(e) => {
                e.preventDefault();
                void handleCancel();
              }}
            >
              {isUpdating ? "Cancelling..." : "Cancel Booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
