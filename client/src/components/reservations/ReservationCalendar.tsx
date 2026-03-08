import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import type { Reservation, PaginatedResponse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ReservationStatusBadge } from "./ReservationStatusBadge";

interface Props {
  onCreateForDate?: (date: string) => void;
}

export function ReservationCalendar({ onCreateForDate }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data: reservationsResponse } = useQuery<PaginatedResponse<Reservation>>({
    queryKey: ["/api/reservations", { dateFrom: getMonthStart(), dateTo: getMonthEnd() }],
    queryFn: async () => {
      const res = await fetch(`/api/reservations?dateFrom=${getMonthStart()}&dateTo=${getMonthEnd()}`, {
        headers: getAuthHeaders(),
        credentials: "include",
      });
      return res.json();
    },
  });

  function getMonthStart() {
    return `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-01`;
  }

  function getMonthEnd() {
    const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    return `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  const reservations = reservationsResponse?.data || [];

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1).getDay();
    const daysInMonth = new Date(currentMonth.year, currentMonth.month + 1, 0).getDate();
    const days: Array<{ day: number | null; dateStr: string; arrivals: Reservation[]; departures: Reservation[]; staying: Reservation[] }> = [];

    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateStr: "", arrivals: [], departures: [], staying: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const arrivals = reservations.filter(r => r.checkInDate === dateStr && r.status !== "cancelled");
      const departures = reservations.filter(r => r.checkOutDate === dateStr && r.status !== "cancelled");
      const staying = reservations.filter(r =>
        r.checkInDate <= dateStr && r.checkOutDate > dateStr && r.status !== "cancelled"
      );
      days.push({ day: d, dateStr, arrivals, departures, staying });
    }

    return days;
  }, [currentMonth, reservations]);

  const today = new Date().toISOString().split('T')[0];
  const monthLabel = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { ...m, month: m.month - 1 })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{monthLabel}</CardTitle>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { ...m, month: m.month + 1 })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500">{d}</div>
          ))}
          {calendarDays.map((cell, i) => (
            <div
              key={i}
              className={`bg-white p-1.5 min-h-[80px] text-xs cursor-pointer hover:bg-gray-50 transition-colors ${cell.dateStr === today ? "ring-2 ring-blue-400 ring-inset" : ""}`}
              onClick={() => cell.day && onCreateForDate?.(cell.dateStr)}
            >
              {cell.day && (
                <>
                  <div className="font-medium text-gray-700 mb-1">{cell.day}</div>
                  {cell.arrivals.map(r => (
                    <div key={r.id} className="bg-green-100 text-green-800 rounded px-1 py-0.5 mb-0.5 truncate" title={`Arriving: ${r.guestName}`}>
                      +{r.guestName}
                    </div>
                  ))}
                  {cell.departures.map(r => (
                    <div key={r.id} className="bg-red-100 text-red-800 rounded px-1 py-0.5 mb-0.5 truncate" title={`Departing: ${r.guestName}`}>
                      -{r.guestName}
                    </div>
                  ))}
                  {cell.staying.length > 0 && (
                    <div className="bg-blue-50 text-blue-600 rounded px-1 py-0.5 truncate">
                      {cell.staying.length} staying
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-100 border border-green-200" /> Arriving</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Departing</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Staying</div>
        </div>
      </CardContent>
    </Card>
  );
}
