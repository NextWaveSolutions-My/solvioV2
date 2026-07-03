"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ScheduleDateRangeFilterProps {
  defaultFrom?: string;
  defaultTo?: string;
}

export function ScheduleDateRangeFilter({
  defaultFrom,
  defaultTo,
}: ScheduleDateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(
    defaultFrom
      ? {
          from: new Date(defaultFrom),
          to: defaultTo ? new Date(defaultTo) : new Date(defaultFrom),
        }
      : undefined
  );

  const handleApply = () => {
    if (!range?.from) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", "custom");
    params.set("from", format(range.from, "yyyy-MM-dd"));
    params.set("to", format(range.to ?? range.from, "yyyy-MM-dd"));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  const label =
    defaultFrom && defaultTo
      ? `${format(new Date(defaultFrom), "MMM d")} – ${format(
          new Date(defaultTo),
          "MMM d, yyyy"
        )}`
      : "Custom range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(!defaultFrom && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
          defaultMonth={range?.from}
        />
        <div className="flex justify-end gap-2 border-t p-3">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={!range?.from}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
