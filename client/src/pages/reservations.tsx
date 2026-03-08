import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Reservation, PaginatedResponse } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users, Clock, AlertCircle } from "lucide-react";
import {
  ReservationForm,
  ReservationTable,
  ReservationFilters,
  ReservationCalendar,
  useReservationMutations,
} from "@/components/reservations";

export default function Reservations() {
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Fetch all reservations
  const { data: reservationsResponse, isLoading } = useQuery<PaginatedResponse<Reservation>>({
    queryKey: ["/api/reservations"],
  });

  // Fetch today's arrivals
  const { data: todayArrivals = [] } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations/arrivals/today"],
  });

  // Fetch upcoming
  const { data: upcomingReservations = [] } = useQuery<Reservation[]>({
    queryKey: ["/api/reservations/upcoming"],
  });

  const allReservations = reservationsResponse?.data || [];

  // Client-side filtering by tab status + search + source
  const filteredReservations = useMemo(() => {
    let filtered = allReservations;

    if (statusFilter === "today") {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(r => r.checkInDate === today && r.status !== "cancelled");
    } else if (statusFilter !== "all") {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.guestName.toLowerCase().includes(term) ||
        r.confirmationNumber.toLowerCase().includes(term) ||
        (r.guestPhone?.toLowerCase().includes(term)) ||
        (r.guestEmail?.toLowerCase().includes(term))
      );
    }

    if (sourceFilter !== "all") {
      filtered = filtered.filter(r => r.source === sourceFilter);
    }

    return filtered;
  }, [allReservations, statusFilter, search, sourceFilter]);

  // Summary counts
  const counts = useMemo(() => ({
    total: allReservations.length,
    confirmed: allReservations.filter(r => r.status === "confirmed").length,
    pending: allReservations.filter(r => r.status === "pending").length,
    todayArrivals: todayArrivals.length,
    upcoming: upcomingReservations.length,
  }), [allReservations, todayArrivals, upcomingReservations]);

  const { createMutation, updateMutation, cancelMutation, convertMutation, deleteMutation } = useReservationMutations({
    onCreateSuccess: () => { setShowForm(false); setEditingReservation(null); },
    onEditSuccess: () => { setShowForm(false); setEditingReservation(null); },
  });

  const handleFormSubmit = useCallback((data: any, isEdit: boolean) => {
    if (isEdit && editingReservation) {
      updateMutation.mutate({ id: editingReservation.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  }, [editingReservation, updateMutation, createMutation]);

  const handleEdit = useCallback((r: Reservation) => {
    setEditingReservation(r);
    setShowForm(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setShowForm(open);
    if (!open) setEditingReservation(null);
  }, []);

  const handleCalendarCreate = useCallback((date: string) => {
    setEditingReservation(null);
    setShowForm(true);
    // The form will use the default date; we could enhance this later
  }, []);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Arrivals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.todayArrivals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming (7d)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.upcoming}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
            <TabsTrigger value="confirmed">Confirmed ({counts.confirmed})</TabsTrigger>
            <TabsTrigger value="today">Today ({counts.todayArrivals})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          <ReservationForm
            open={showForm}
            onOpenChange={handleDialogOpenChange}
            editingReservation={editingReservation}
            onSubmit={handleFormSubmit}
            onCancel={() => { setShowForm(false); setEditingReservation(null); }}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
          />
        </div>

        <TabsContent value={statusFilter} forceMount className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              <ReservationFilters
                search={search}
                onSearchChange={setSearch}
                source={sourceFilter}
                onSourceChange={setSourceFilter}
              />
              <ReservationTable
                reservations={filteredReservations}
                isLoading={isLoading}
                onEdit={handleEdit}
                onCancel={(id) => cancelMutation.mutate({ id })}
                onConvert={(id) => convertMutation.mutate(id)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Calendar View */}
      <ReservationCalendar onCreateForDate={handleCalendarCreate} />
    </div>
  );
}
