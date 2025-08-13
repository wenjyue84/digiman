import SortableGuestTable from "@/components/sortable-guest-table";
import DailyNotifications from "@/components/daily-notifications";
import AdminNotifications from "@/components/admin-notifications";
import OccupancyCalendar from "@/components/occupancy-calendar";
import { useAuth } from "@/components/auth-provider";

export default function Dashboard() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-6">
      <SortableGuestTable />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyNotifications />
        <AdminNotifications />
      </div>
      {isAuthenticated && <OccupancyCalendar />}
    </div>
  );
}