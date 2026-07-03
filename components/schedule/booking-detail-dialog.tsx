"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  CalendarClock,
  CalendarIcon,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  User as UserIcon,
  Wrench,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookingStatusBadge } from "@/components/schedule/booking-status-badge";
import {
  cancelServiceBooking,
  completeServiceBooking,
  confirmServiceBooking,
  updateServiceBooking,
} from "@/actions/service-bookings";
import type { ApiResponse, ServiceBookingStatus } from "@/types";

export interface ScheduleBooking {
  _id: string;
  ticketId: string;
  customerName: string;
  phone: string;
  address: string;
  serviceType: string;
  scheduledAt: string;
  status: ServiceBookingStatus;
}

interface BookingDetailDialogProps {
  booking: ScheduleBooking | null;
  onOpenChange: (open: boolean) => void;
}

function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function BookingDetailDialog({
  booking,
  onOpenChange,
}: BookingDetailDialogProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (booking) {
      const scheduled = new Date(booking.scheduledAt);
      setDate(scheduled);
      setTime(toTimeInputValue(scheduled));
      setIsRescheduling(false);
      setError("");
    }
  }, [booking]);

  const runStatusAction = async (
    action: () => Promise<ApiResponse<unknown>>,
    successMessage: string
  ) => {
    setIsUpdating(true);
    const result = await action();
    if (result.success) {
      toast.success(result.message || successMessage);
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Something went wrong");
    }
    setIsUpdating(false);
  };

  const handleReschedule = async () => {
    if (!booking || !date || !time) {
      setError("Please pick a date and time");
      return;
    }
    setError("");

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    setIsUpdating(true);
    const result = await updateServiceBooking(booking._id, { scheduledAt });
    if (result.success) {
      toast.success("Booking rescheduled");
      router.refresh();
      onOpenChange(false);
    } else {
      setError(result.error || "Failed to reschedule booking");
      toast.error(result.error || "Failed to reschedule booking");
    }
    setIsUpdating(false);
  };

  const canManage =
    !!booking && (booking.status === "pending" || booking.status === "confirmed");

  return (
    <Dialog
      open={!!booking}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        {booking && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-2 pr-6">
                <DialogTitle className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  {booking.serviceType}
                </DialogTitle>
                <BookingStatusBadge status={booking.status} />
              </div>
              <DialogDescription>
                Update the status or reschedule this booking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center">
                <UserIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{booking.customerName}</span>
              </div>
              <div className="flex items-center">
                <Phone className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{booking.phone}</span>
              </div>
              <div className="flex items-start">
                <MapPin className="mr-2 h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span>{booking.address}</span>
              </div>
              <div className="flex items-center">
                <CalendarClock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  {format(new Date(booking.scheduledAt), "PPP 'at' p")}
                </span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isRescheduling && (
              <div className="space-y-4">
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUpdating}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(selected) => {
                            setDate(selected);
                            setCalendarOpen(false);
                          }}
                          disabled={{
                            before: new Date(new Date().setHours(0, 0, 0, 0)),
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reschedule-time">Time</Label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {booking.status === "pending" && (
                  <Button
                    size="sm"
                    disabled={isUpdating}
                    onClick={() =>
                      runStatusAction(
                        () => confirmServiceBooking(booking._id),
                        "Booking confirmed — customer notified on WhatsApp"
                      )
                    }
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    )}
                    Confirm
                  </Button>
                )}
                {booking.status === "confirmed" && (
                  <Button
                    size="sm"
                    disabled={isUpdating}
                    onClick={() =>
                      runStatusAction(
                        () => completeServiceBooking(booking._id),
                        "Booking marked as completed"
                      )
                    }
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                    )}
                    Mark Completed
                  </Button>
                )}
                {canManage && !isRescheduling && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => setIsRescheduling(true)}
                  >
                    <CalendarClock className="mr-2 h-3.5 w-3.5" />
                    Reschedule
                  </Button>
                )}
                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={isUpdating}
                    onClick={() =>
                      runStatusAction(
                        () => cancelServiceBooking(booking._id),
                        "Booking cancelled"
                      )
                    }
                  >
                    <XCircle className="mr-2 h-3.5 w-3.5" />
                    Cancel Booking
                  </Button>
                )}
              </div>

              {isRescheduling && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={isUpdating}
                    onClick={() => setIsRescheduling(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isUpdating}
                    onClick={handleReschedule}
                  >
                    {isUpdating ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CalendarClock className="mr-2 h-3.5 w-3.5" />
                    )}
                    Save New Time
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
