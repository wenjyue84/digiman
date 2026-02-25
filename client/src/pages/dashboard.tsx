import React, { Suspense, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import OccupancyCalendar from "@/components/occupancy-calendar";

const SortableGuestTable = React.lazy(
  () => import("@/components/sortable-guest-table")
);
const DailyNotifications = React.lazy(
  () => import("@/components/daily-notifications")
);
const AdminNotifications = React.lazy(
  () => import("@/components/admin-notifications")
);

function useLazyRender<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, visible } as const;
}

export default function Dashboard() {
  const table = useLazyRender<HTMLDivElement>();
  const daily = useLazyRender<HTMLDivElement>();
  const admin = useLazyRender<HTMLDivElement>();
  const calendar = useLazyRender<HTMLDivElement>();

  return (
    <div className="space-y-6">
      <div ref={table.ref}>
        {table.visible && (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <SortableGuestTable />
          </Suspense>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div ref={daily.ref}>
          {daily.visible && (
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <DailyNotifications />
            </Suspense>
          )}
        </div>
        <div ref={admin.ref}>
          {admin.visible && (
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <AdminNotifications />
            </Suspense>
          )}
        </div>
      </div>
      <div ref={calendar.ref}>
        {calendar.visible && (
          <Suspense fallback={<Skeleton className="h-80 w-full" />}>
            <OccupancyCalendar />
          </Suspense>
        )}
      </div>
    </div>
  );
}
