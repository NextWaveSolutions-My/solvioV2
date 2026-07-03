import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { getAllServiceBookings } from "@/actions/service-bookings";
import { Card } from "@/components/ui/card";
import { ScheduleRangeTabs } from "@/components/schedule/schedule-range-tabs";
import { ScheduleDateRangeFilter } from "@/components/schedule/schedule-date-range-filter";
import { ScheduleBookingsTable } from "@/components/schedule/schedule-bookings-table";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

interface SchedulePageProps {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
}

function resolveRange(range: string, from?: string, to?: string) {
  const now = new Date();

  if (range === "week") {
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
  if (range === "month") {
    return { from: startOfMonth(now), to: endOfMonth(now) };
  }
  if (range === "custom" && from) {
    const fromDate = startOfDay(new Date(from));
    const toDate = to ? endOfDay(new Date(to)) : endOfDay(fromDate);
    return { from: fromDate, to: toDate };
  }
  return { from: startOfDay(now), to: endOfDay(now) };
}

export default async function AdminSchedulePage({
  searchParams,
}: SchedulePageProps) {
  const params = await searchParams;
  const range =
    params.range === "week" ||
    params.range === "month" ||
    (params.range === "custom" && params.from)
      ? params.range
      : "today";

  const { from, to } = resolveRange(range, params.from, params.to);

  const bookingsResult = await getAllServiceBookings({ from, to });
  const bookings = bookingsResult.success ? bookingsResult.data || [] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Schedule
        </h1>
        <p className="text-muted-foreground mt-2">
          All cleaning service bookings — confirm, reschedule, or update
          status.
        </p>
      </div>

      <Card className="border-border rounded-lg p-3 shadow-none sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <ScheduleRangeTabs activeRange={range} />
          <ScheduleDateRangeFilter
            defaultFrom={range === "custom" ? params.from : undefined}
            defaultTo={range === "custom" ? params.to : undefined}
          />
        </div>

        <div className="mt-4">
          <ScheduleBookingsTable bookings={bookings} />
        </div>
      </Card>
    </div>
  );
}
