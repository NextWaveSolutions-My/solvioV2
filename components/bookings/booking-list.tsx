import { CalendarClock } from "lucide-react";
import { BookingCard, type BookingCardData } from "@/components/bookings/booking-card";

interface BookingListProps {
  bookings: BookingCardData[];
}

export function BookingList({ bookings }: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
        <CalendarClock className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No bookings scheduled yet for this ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {bookings.map((booking) => (
        <BookingCard key={booking._id} booking={booking} />
      ))}
    </div>
  );
}
