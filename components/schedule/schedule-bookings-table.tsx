"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDataTablePagination } from "@/hooks/use-data-table-pagination";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { BookingStatusBadge } from "@/components/schedule/booking-status-badge";
import {
  BookingDetailDialog,
  type ScheduleBooking,
} from "@/components/schedule/booking-detail-dialog";

interface ScheduleBookingsTableProps {
  bookings: ScheduleBooking[];
}

export function ScheduleBookingsTable({ bookings }: ScheduleBookingsTableProps) {
  const [selected, setSelected] = useState<ScheduleBooking | null>(null);
  const {
    page,
    pageSize,
    pageSizeOptions,
    paginatedItems: paginatedBookings,
    startItem,
    endItem,
    totalItems,
    goToPage,
    updatePageSize,
  } = useDataTablePagination(bookings);

  if (bookings.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        No bookings in this range
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card/50">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/20 hover:bg-muted/20">
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Customer
                </TableHead>
                <TableHead className="hidden md:table-cell h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Phone
                </TableHead>
                <TableHead className="hidden lg:table-cell h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Address
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Service
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Scheduled
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background/50">
              {paginatedBookings.map((booking) => (
                <TableRow
                  key={booking._id}
                  className="cursor-pointer border-b border-border/30 transition-colors hover:bg-muted/30"
                  onClick={() => setSelected(booking)}
                >
                  <TableCell className="py-3.5 px-4 font-medium text-foreground">
                    {booking.customerName}
                  </TableCell>
                  <TableCell className="hidden md:table-cell py-3.5 px-4 text-sm text-muted-foreground">
                    {booking.phone}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell py-3.5 px-4 max-w-[220px] truncate text-sm text-muted-foreground">
                    {booking.address}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-sm">
                    {booking.serviceType}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-sm text-muted-foreground">
                    {format(new Date(booking.scheduledAt), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <BookingStatusBadge status={booking.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          totalItems={totalItems}
          startItem={startItem}
          endItem={endItem}
          onPageChange={goToPage}
          onPageSizeChange={updatePageSize}
          resultsLabel="bookings"
        />
      </div>

      <BookingDetailDialog
        booking={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
