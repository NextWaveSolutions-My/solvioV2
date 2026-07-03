"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const RANGE_TABS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

interface ScheduleRangeTabsProps {
  activeRange: string;
}

export function ScheduleRangeTabs({ activeRange }: ScheduleRangeTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    params.delete("from");
    params.delete("to");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const isKnownTab = RANGE_TABS.some((tab) => tab.value === activeRange);

  return (
    <Tabs value={isKnownTab ? activeRange : ""} onValueChange={handleChange}>
      <TabsList>
        {RANGE_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
