import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { PaginatedResponse } from "@shared/schema";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { List, Table as TableIcon, CreditCard, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from "@/components/ui/button";

// Types
interface Guest {
  id: string;
  name: string;
  capsuleNumber: string;
  checkinTime: string;
  checkoutTime?: string;
  nationality?: string;
  phoneNumber?: string;
  email?: string;
  idNumber?: string;
}

interface Capsule {
  id: string;
  number: string;
  lastCleanedAt?: string;
  lastCleanedBy?: string;
}

// Using PaginatedResponse from shared schema which has nested pagination object

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

// Date filtering helper functions
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return isSameDay(date, today);
}

function isThisWeek(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
}

function isThisMonth(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth();
}

function isInDateRange(dateString: string, start: string, end: string): boolean {
  if (!start || !end) return true;
  const date = new Date(dateString);
  // Parse date inputs in local time by appending time component
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);
  return date >= startDate && date <= endDate;
}

function matchesExactDate(dateString: string, exactDate: string): boolean {
  if (!exactDate) return true;
  const date = new Date(dateString);
  // Parse date input in local time by appending time component
  const targetStart = new Date(`${exactDate}T00:00:00`);
  const targetEnd = new Date(`${exactDate}T23:59:59`);
  return date >= targetStart && date <= targetEnd;
}

function isLast7Days(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  return date >= sevenDaysAgo && date <= todayEnd;
}

function isLast30Days(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);
  
  return date >= thirtyDaysAgo && date <= todayEnd;
}

export default function History() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  
  const [searchQuery, setSearchQuery] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState("all");
  const [capsuleFilter, setCapsuleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [sortBy, setSortBy] = useState<string>('checkoutTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  
  
  const [dateFilter, setDateFilter] = useState("last7");


  
  const [guestViewMode, setGuestViewMode] = useState<'table' | 'list' | 'card'>('table');

  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");
  const [exactDate, setExactDate] = useState<string>("");
  
  const [cleaningViewMode, setCleaningViewMode] = useState<'table' | 'list' | 'card'>('table');

  
  // Build query parameters for backend filtering
  const buildQueryString = () => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy,
      sortOrder,
    });
    
    if (searchQuery) params.append('search', searchQuery);
    if (nationalityFilter !== 'all') params.append('nationality', nationalityFilter);
    if (capsuleFilter !== 'all') params.append('capsule', capsuleFilter);
    
    return params.toString();
  };

  const { data: guestHistoryResponse, isLoading } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ['/api/guests/history', { page, limit, sortBy, sortOrder, searchQuery, nationalityFilter, capsuleFilter }],
    queryFn: async () => {
      const res = await fetch(`/api/guests/history?${buildQueryString()}`);
      if (!res.ok) throw new Error('Failed to fetch guest history');
      return res.json();
    },
  });
  
  // Handle column header click for sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1); // Reset to first page when sorting changes
  };
  
  // Get sort icon for a column
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  
  // Backend handles filtering, so we use the returned data directly
  const guestHistory = guestHistoryResponse?.data || [];
  const totalGuests = guestHistoryResponse?.pagination?.total || 0;
  const totalPages = guestHistoryResponse?.pagination?.totalPages || 0;

  // Extract unique nationalities and capsules for filter dropdowns from current page
  // Note: This shows options from currently loaded data; users can search for others
  const uniqueNationalities = Array.from(
    new Set(guestHistory.map(g => g.nationality).filter(Boolean))
  ).sort();
  
  const uniqueCapsules = Array.from(
    new Set(guestHistory.map(g => g.capsuleNumber).filter(Boolean))
  ).sort();
  
  // Reset to page 1 when filters change
  const handleFilterChange = (filterType: 'search' | 'nationality' | 'capsule', value: string) => {
    setPage(1);
    if (filterType === 'search') setSearchQuery(value);
    else if (filterType === 'nationality') setNationalityFilter(value);
    else if (filterType === 'capsule') setCapsuleFilter(value);
  };

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

  // Apply client-side date filtering
  const filteredHistory = useMemo(() => {
    if (dateFilter === 'all') return guestHistory;
    
    return guestHistory.filter(guest => {
      const checkinDate = guest.checkinTime;
      const checkoutDate = guest.checkoutTime;
      
      // Check if either check-in or check-out matches the filter
      switch (dateFilter) {
        case 'today':
          return (checkinDate && isToday(checkinDate)) || (checkoutDate && isToday(checkoutDate));
        
        case 'last7':
          return (checkinDate && isLast7Days(checkinDate)) || (checkoutDate && isLast7Days(checkoutDate));
        
        case 'last30':
          return (checkinDate && isLast30Days(checkinDate)) || (checkoutDate && isLast30Days(checkoutDate));
        
        case 'week':
          return (checkinDate && isThisWeek(checkinDate)) || (checkoutDate && isThisWeek(checkoutDate));
        
        case 'month':
          return (checkinDate && isThisMonth(checkinDate)) || (checkoutDate && isThisMonth(checkoutDate));
        
        case 'exact':
          if (!exactDate) return true;
          return (checkinDate && matchesExactDate(checkinDate, exactDate)) || 
                 (checkoutDate && matchesExactDate(checkoutDate, exactDate));
        
        case 'range':
          if (!rangeStart || !rangeEnd) return true;
          return (checkinDate && isInDateRange(checkinDate, rangeStart, rangeEnd)) || 
                 (checkoutDate && isInDateRange(checkoutDate, rangeStart, rangeEnd));
        
        default:
          return true;
      }
    });
  }, [guestHistory, dateFilter, exactDate, rangeStart, rangeEnd]);

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold text-hostel-text">Guest History</CardTitle>
              <p className="text-sm text-gray-600">
                {isLoading ? 'Loading...' : dateFilter !== 'all' 
                  ? `${filteredHistory.length} of ${totalGuests} checked-out guests` 
                  : `${totalGuests} checked-out guests in total`}
              </p>
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
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
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
        
        {/* Search and Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, email, or ID..."
              value={searchQuery}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
              data-testid="input-search-guests"
            />
          </div>
          
          <Select value={nationalityFilter} onValueChange={(value) => handleFilterChange('nationality', value)}>
            <SelectTrigger className="w-[180px]" data-testid="select-nationality-filter">
              <SelectValue placeholder="All Nationalities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Nationalities</SelectItem>
              {uniqueNationalities.map(nationality => (
                <SelectItem key={nationality} value={nationality || ''}>{nationality}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={capsuleFilter} onValueChange={(value) => handleFilterChange('capsule', value)}>
            <SelectTrigger className="w-[140px]" data-testid="select-capsule-filter">
              <SelectValue placeholder="All Capsules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Capsules</SelectItem>
              {uniqueCapsules.map(capsule => (
                <SelectItem key={capsule} value={capsule}>{capsule}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                              onClick={() => handleSort('name')}
                              data-testid="header-sort-name"
                            >
                              <div className="flex items-center">
                                Guest Name
                                {getSortIcon('name')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                              onClick={() => handleSort('capsuleNumber')}
                              data-testid="header-sort-capsule"
                            >
                              <div className="flex items-center">
                                Capsule
                                {getSortIcon('capsuleNumber')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                              onClick={() => handleSort('checkinTime')}
                              data-testid="header-sort-checkin"
                            >
                              <div className="flex items-center">
                                Check-in
                                {getSortIcon('checkinTime')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                              onClick={() => handleSort('checkoutTime')}
                              data-testid="header-sort-checkout"
                            >
                              <div className="flex items-center">
                                Check-out
                                {getSortIcon('checkoutTime')}
                              </div>
                            </TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredHistory.map((guest) => (
                            <TableRow key={guest.id}>
                              <TableCell className="font-medium">{guest.name}</TableCell>
                              <TableCell>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  {guest.capsuleNumber}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {new Date(guest.checkinTime).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                {guest.checkoutTime 
                                  ? new Date(guest.checkoutTime).toLocaleString()
                                  : <Badge variant="secondary">Still checked in</Badge>
                                }
                              </TableCell>
                              <TableCell>
                                {guest.checkoutTime 
                                  ? formatDuration(guest.checkinTime, guest.checkoutTime)
                                  : (() => {
                                      const now = new Date().toISOString();
                                      return formatDuration(guest.checkinTime, now);
                                    })()
                                }
                              </TableCell>
                              <TableCell>
                                {guest.checkoutTime && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => recheckinMutation.mutate(guest.id)}
                                    disabled={recheckinMutation.isPending}
                                  >
                                    {recheckinMutation.isPending ? 'Moving...' : 'Re-check in'}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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
            
            {/* Pagination Controls */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 mt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Page info and size selector */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{totalGuests === 0 ? 0 : ((page - 1) * limit) + 1}-{totalGuests === 0 ? 0 : Math.min(page * limit, totalGuests)}</span> of <span className="font-medium">{totalGuests}</span> guests
                  </p>
                  <Select value={limit.toString()} onValueChange={(value) => { setLimit(Number(value)); setPage(1); }}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page navigation */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {/* Show page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Cleaning History */}
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-hostel-text">Cleaning History</CardTitle>
            <p className="text-sm text-gray-600">Record of capsule cleaning and maintenance activities</p>
          </div>
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
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Capsule Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Cleaned</TableHead>
                            <TableHead>Cleaned By</TableHead>
                            <TableHead>Duration Since Clean</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cleanedCapsules.map((capsule) => (
                            <TableRow key={capsule.id}>
                              <TableCell className="font-medium">{capsule.number}</TableCell>
                              <TableCell>
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Clean
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {capsule.lastCleanedAt 
                                  ? new Date(capsule.lastCleanedAt).toLocaleString()
                                  : 'N/A'
                                }
                              </TableCell>
                              <TableCell>{capsule.lastCleanedBy || 'N/A'}</TableCell>
                              <TableCell>
                                {capsule.lastCleanedAt 
                                  ? (() => {
                                      const now = new Date();
                                      const cleaned = new Date(capsule.lastCleanedAt);
                                      const diffHours = Math.floor((now.getTime() - cleaned.getTime()) / (1000 * 60 * 60));
                                      const diffDays = Math.floor(diffHours / 24);
                                      
                                      if (diffDays > 0) {
                                        return `${diffDays}d ${diffHours % 24}h ago`;
                                      } else {
                                        return `${diffHours}h ago`;
                                      }
                                    })()
                                  : 'N/A'
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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