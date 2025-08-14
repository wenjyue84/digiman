import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, Table as TableIcon, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";

// ... (keep existing imports)


function formatDuration(checkinTime: string, checkoutTime: string): string {
  const checkin = new Date(checkinTime);
  const checkout = new Date(checkoutTime);
  const diff = checkout.getTime() - checkin.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

function getInitials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export default function History() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  
  const [searchQuery, setSearchQuery] = useState("");


  
  
  const [dateFilter, setDateFilter] = useState("all");


  
  const [guestViewMode, setGuestViewMode] = useState<'table' | 'list' | 'card'>('table');

  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  
  const [cleaningViewMode, setCleaningViewMode] = useState<'table' | 'list' | 'card'>('table');

  
  const { data: guestHistoryResponse, isLoading } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/history"],
  });
  
  const guestHistory = guestHistoryResponse?.data || [];

  // Cleaning history
  const { data: cleanedCapsules = [], isLoading: cleaningLoading } = useQuery<Capsule[]>({
    queryKey: ["/api/capsules/cleaning-status/cleaned"],
  });

  const recheckinMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const res = await apiRequest("POST", "/api/guests/recheckin", { id: guestId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({ title: "Updated", description: "Guest moved back to checked-in." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "Failed to re-check in guest", variant: "destructive" });
    }
  });

  const filteredHistory = guestHistory.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (dateFilter === "all") return matchesSearch;
    
    const checkinDate = new Date(guest.checkinTime);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (dateFilter) {
      case "today":
        return matchesSearch && checkinDate >= todayStart;
      case "week":
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        return matchesSearch && checkinDate >= weekStart;
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return matchesSearch && checkinDate >= monthStart;
      case "exact":
        if (!exactDate) return matchesSearch;
        {
          const d = new Date(exactDate);
          const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
          return matchesSearch && checkinDate >= start && checkinDate <= end;
        }
      case "range":
        if (!rangeStart && !rangeEnd) return matchesSearch;
        {
          const start = rangeStart ? new Date(new Date(rangeStart).setHours(0,0,0,0)) : new Date(0);
          const end = rangeEnd ? new Date(new Date(rangeEnd).setHours(23,59,59,999)) : new Date(8640000000000000);
          return matchesSearch && checkinDate >= start && checkinDate <= end;
        }
      default:
        return matchesSearch;
    }
  });

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-hostel-text">Guest History</CardTitle>
            <p className="text-sm text-gray-600">Complete record of all guest check-ins and check-outs</p>
          </div>
          <div className="flex items-center space-x-4 flex-wrap gap-y-2">
            
            <div className="flex items-center gap-2">
              <Button variant={guestViewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setGuestViewMode('table')}>
                <TableIcon className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button variant={guestViewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setGuestViewMode('list')}>
                <List className="h-4 w-4 mr-1" />
                List
              </Button>
              <Button variant={guestViewMode === 'card' ? 'default' : 'outline'} size="sm" onClick={() => setGuestViewMode('card')}>
                <CreditCard className="h-4 w-4 mr-1" />
                Card
              </Button>
            </div>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Records</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="exact">Exact Date…</SelectItem>
                <SelectItem value="range">Date Range…</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === "exact" && (
              <input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="border rounded px-2 py-2 text-sm"
              />
            )}
            {dateFilter === "range" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="border rounded px-2 py-2 text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="border rounded px-2 py-2 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No guest history found</p>
          </div>
        ) : (
          <>
            {(() => {
              switch (guestViewMode) {
                case 'table':
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        {/* ... table content ... */}
                      </table>
                    </div>
                  );
                case 'list':
                  return (
                    <div className="space-y-2">
                      {filteredHistory.map((record) => (
                        <div key={record.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{record.name}</span>
                            <Badge className="bg-blue-600 text-white">{record.capsuleNumber}</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(record.checkinTime).toLocaleDateString()} - {record.checkoutTime ? new Date(record.checkoutTime).toLocaleDateString() : 'Present'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                case 'card':
                  return (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredHistory.map((record) => (
                        <Card key={record.id}>
                          <CardHeader>
                            <CardTitle>{record.name}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p>Capsule: {record.capsuleNumber}</p>
                            <p>Check-in: {new Date(record.checkinTime).toLocaleString()}</p>
                            <p>Check-out: {record.checkoutTime ? new Date(record.checkoutTime).toLocaleString() : 'Not checked out'}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                default:
                  return null;
              }
            })()}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing <span className="font-medium">1-{filteredHistory.length}</span> of <span className="font-medium">{guestHistory.length}</span> records
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Cleaning History */}
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant={cleaningViewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setCleaningViewMode('table')}>
            <TableIcon className="h-4 w-4 mr-1" />
            Table
          </Button>
          <Button variant={cleaningViewMode === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setCleaningViewMode('list')}>
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button variant={cleaningViewMode === 'card' ? 'default' : 'outline'} size="sm" onClick={() => setCleaningViewMode('card')}>
            <CreditCard className="h-4 w-4 mr-1" />
            Card
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {cleaningLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : cleanedCapsules.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No cleaning records</div>
        ) : (
          <>
            {(() => {
              switch (cleaningViewMode) {
                case 'table':
                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full divide-y divide-gray-200">
                        {/* ... table content ... */}
                      </table>
                    </div>
                  );
                case 'list':
                  return (
                    <div className="space-y-2">
                      {cleanedCapsules.map((c) => (
                        <div key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{c.number}</span>
                            <Badge className="bg-green-600 text-white">Clean</Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            {c.lastCleanedAt ? new Date(c.lastCleanedAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                case 'card':
                  return (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {cleanedCapsules.map((c) => (
                        <Card key={c.id}>
                          <CardHeader>
                            <CardTitle>{c.number}</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p>Status: Clean</p>
                            <p>Cleaned At: {c.lastCleanedAt ? new Date(c.lastCleanedAt).toLocaleString() : 'N/A'}</p>
                            <p>Cleaned By: {c.lastCleanedBy || 'N/A'}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                default:
                  return null;
              }
            })()}
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );
}