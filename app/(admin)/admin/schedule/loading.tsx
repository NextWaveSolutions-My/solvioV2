import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Admin Schedule List Loading State
 * Matches the layout of the schedule page
 */
export default function AdminScheduleLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Tabs + Filter + Table */}
      <Card className="border-border rounded-lg p-3 shadow-none sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center gap-4 px-4 py-4 border-b bg-muted/20">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>

          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-4 border-b last:border-0"
            >
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
