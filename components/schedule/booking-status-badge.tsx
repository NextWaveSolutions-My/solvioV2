import { CalendarClock, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ServiceBookingStatus } from "@/types";

export function BookingStatusBadge({ status }: { status: ServiceBookingStatus }) {
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
