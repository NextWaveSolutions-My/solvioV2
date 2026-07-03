"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarClock, CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createServiceBooking,
  updateServiceBooking,
} from "@/actions/service-bookings";
import type { ServiceBookingFormData } from "@/types";

type BookingRecord = {
  _id: string;
  customerName: string;
  phone: string;
  address: string;
  serviceType: string;
  scheduledAt: string;
};

interface BookingFormDialogProps {
  ticketId: string;
  /** Present => edit/reschedule an existing booking. Absent => create a new one. */
  booking?: BookingRecord;
  defaultCustomerName?: string;
  trigger?: React.ReactNode;
}

function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function BookingFormDialog({
  ticketId,
  booking,
  defaultCustomerName,
  trigger,
}: BookingFormDialogProps) {
  const router = useRouter();
  const isEdit = !!booking;
  const initialDate = booking ? new Date(booking.scheduledAt) : undefined;

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState(
    booking?.customerName ?? defaultCustomerName ?? ""
  );
  const [phone, setPhone] = useState(booking?.phone ?? "");
  const [address, setAddress] = useState(booking?.address ?? "");
  const [serviceType, setServiceType] = useState(booking?.serviceType ?? "");
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState(
    initialDate ? toTimeInputValue(initialDate) : ""
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  const resetForm = () => {
    setCustomerName(booking?.customerName ?? defaultCustomerName ?? "");
    setPhone(booking?.phone ?? "");
    setAddress(booking?.address ?? "");
    setServiceType(booking?.serviceType ?? "");
    setDate(initialDate);
    setTime(initialDate ? toTimeInputValue(initialDate) : "");
    setError("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    setOpen(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerName.trim() || !phone.trim() || !address.trim() || !serviceType.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (!date || !time) {
      setError("Please pick a date and time");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const scheduledAt = new Date(date);
    scheduledAt.setHours(hours, minutes, 0, 0);

    const data: ServiceBookingFormData = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      serviceType: serviceType.trim(),
      scheduledAt,
    };

    setIsSubmitting(true);
    const result = isEdit
      ? await updateServiceBooking(booking!._id, data)
      : await createServiceBooking(ticketId, data);

    if (result.success) {
      toast.success(isEdit ? "Booking updated" : "Booking scheduled");
      setOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Failed to save booking");
      toast.error(result.error || "Failed to save booking");
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <CalendarClock className="mr-2 h-4 w-4" />
            Schedule Booking
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Reschedule Booking" : "Schedule Booking"}
          </DialogTitle>
          <DialogDescription>
            Pick a date and time for the technician to visit the customer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="booking-customer-name">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="booking-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g., Jane Cooper"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="booking-phone">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="booking-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., 15551234567"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-service-type">
                Service Type <span className="text-destructive">*</span>
              </Label>
              <Input
                id="booking-service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                placeholder="e.g., Washing Machine Cleaning"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="booking-address">
              Address <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="booking-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, postal code"
              rows={2}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
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
                    disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-time">
                Time <span className="text-destructive">*</span>
              </Label>
              <Input
                id="booking-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CalendarClock className="mr-2 h-4 w-4" />
                  {isEdit ? "Save Changes" : "Schedule Booking"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
