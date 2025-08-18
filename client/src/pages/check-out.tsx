import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus, CheckCheck, ToggleLeft, ToggleRight, ChevronRight, User, Calendar, Bell, Filter as FilterIcon, CreditCard, List, Table as TableIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { NATIONALITIES } from "@/lib/nationalities";

import type { Guest, PaginatedResponse } from "@shared/schema";
import { isGuestPaid } from "@/lib/guest";

function formatDuration(checkinTime: string): string {
  const checkin = new Date(checkinTime);
  const now = new Date();
  const diff = now.getTime() - checkin.getTime();
  
  const totalHours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  // If stay is 24 hours or more, show days and hours
  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;
    
    if (remainingHours === 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
    }
  }
  
  // For stays less than 24 hours, show hours and minutes
  if (totalHours === 0) {
    return `${minutes}m`;
  }
  
  return `${totalHours}h ${minutes}m`;
}

function getInitials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

function getGenderIcon(gender?: string) {
  if (gender === 'female') {
    return { icon: '♀', bgColor: 'bg-pink-100', textColor: 'text-pink-600' };
  } else if (gender === 'male') {
    return { icon: '♂', bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
  }
  // For other/unspecified/no gender - use purple
  return { icon: null, bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
}

export default function CheckOut() {
  const labels = useAccommodationLabels();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isCondensedView, setIsCondensedView] = useState(() => isMobile);
  const [showBulkCheckoutConfirmation, setShowBulkCheckoutConfirmation] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'list' | 'table'>('table');

  // Auto-switch view mode based on device type
  useEffect(() => {
    setIsCondensedView(isMobile);
  }, [isMobile]);
  
  const { data: guestsResponse, isLoading } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
  });
  
  const guests = guestsResponse?.data || [];

  // Helper functions for date shortcuts
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const getToday = () => getDateString(new Date());
  const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return getDateString(date);
  };
  const getTomorrow = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return getDateString(date);
  };

  const setCheckinDateShortcut = (type: 'today' | 'yesterday' | 'tomorrow') => {
    let dateValue = '';
    switch (type) {
      case 'today':
        dateValue = getToday();
        break;
      case 'yesterday':
        dateValue = getYesterday();
        break;
      case 'tomorrow':
        dateValue = getTomorrow();
        break;
    }
    setFilters(prev => ({
      ...prev,
      checkinDateFrom: dateValue,
      checkinDateTo: dateValue
    }));
  };

  const setExpectedCheckoutDateShortcut = (type: 'today' | 'yesterday' | 'tomorrow') => {
    let dateValue = '';
    switch (type) {
      case 'today':
        dateValue = getToday();
        break;
      case 'yesterday':
        dateValue = getYesterday();
        break;
      case 'tomorrow':
        dateValue = getTomorrow();
        break;
    }
    setFilters(prev => ({
      ...prev,
      expectedCheckoutDateFrom: dateValue,
      expectedCheckoutDateTo: dateValue
    }));
  };

  // Helper function to calculate length of stay in days
  const getLengthOfStayDays = (checkinTime: string): number => {
    const checkin = new Date(checkinTime);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - checkin.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get unique capsule numbers from current guests
  const uniqueCapsules = useMemo(() => {
    const capsules = [...new Set(guests.map(g => g.capsuleNumber))].sort((a, b) => {
      // Sort capsules numerically if they're numbers, otherwise alphabetically
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
    return capsules;
  }, [guests]);

  // Use the standardized nationality list from the system
  const availableNationalities = useMemo(() => {
    return NATIONALITIES.map(n => n.value).sort();
  }, []);

  // Filters (replicated from Dashboard)
  const [filters, setFilters] = useState({
    gender: 'any' as 'any' | 'male' | 'female',
    nationality: 'any' as 'any' | 'malaysian' | 'non-malaysian',
    specificNationality: 'any' as string,
    capsuleNumber: 'any' as string,
    lengthOfStayMin: '',
    lengthOfStayMax: '',
    outstandingOnly: false,
    checkoutTodayOnly: false,
    checkinDateFrom: '',
    checkinDateTo: '',
    expectedCheckoutDateFrom: '',
    expectedCheckoutDateTo: '',
  });

  const hasActiveGuestFilters = filters.gender !== 'any' || filters.nationality !== 'any' || filters.specificNationality !== 'any' || filters.capsuleNumber !== 'any' || filters.lengthOfStayMin || filters.lengthOfStayMax || filters.outstandingOnly || filters.checkoutTodayOnly || filters.checkinDateFrom || filters.checkinDateTo || filters.expectedCheckoutDateFrom || filters.expectedCheckoutDateTo;

  const isDateToday = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      return dateStr.slice(0, 10) === todayStr;
    } catch {
      return false;
    }
  };

  const filteredGuests = useMemo(() => {
    return guests.filter((g) => {
      // Gender filtering
      if (filters.gender !== 'any' && g.gender !== filters.gender) return false;
      
      // General nationality filtering (Malaysian vs Non-Malaysian)
      if (filters.nationality === 'malaysian' && g.nationality !== 'Malaysian') return false;
      if (filters.nationality === 'non-malaysian' && g.nationality === 'Malaysian') return false;
      
      // Specific nationality filtering
      if (filters.specificNationality !== 'any' && g.nationality !== filters.specificNationality) return false;
      
      // Capsule number filtering
      if (filters.capsuleNumber !== 'any' && g.capsuleNumber !== filters.capsuleNumber) return false;
      
      // Length of stay filtering (in days)
      const lengthOfStay = getLengthOfStayDays(g.checkinTime.toString());
      if (filters.lengthOfStayMin && lengthOfStay < parseInt(filters.lengthOfStayMin)) return false;
      if (filters.lengthOfStayMax && lengthOfStay > parseInt(filters.lengthOfStayMax)) return false;
      
      // Payment and checkout status filtering
      if (filters.outstandingOnly && isGuestPaid(g)) return false;
      if (filters.checkoutTodayOnly && !isDateToday(g.expectedCheckoutDate || undefined)) return false;
      
      // Check-in date filtering
      if (filters.checkinDateFrom) {
        const checkinDate = new Date(g.checkinTime).toISOString().split('T')[0];
        if (checkinDate < filters.checkinDateFrom) return false;
      }
      if (filters.checkinDateTo) {
        const checkinDate = new Date(g.checkinTime).toISOString().split('T')[0];
        if (checkinDate > filters.checkinDateTo) return false;
      }
      
      // Expected checkout date filtering
      if (filters.expectedCheckoutDateFrom && g.expectedCheckoutDate) {
        if (g.expectedCheckoutDate < filters.expectedCheckoutDateFrom) return false;
      }
      if (filters.expectedCheckoutDateTo && g.expectedCheckoutDate) {
        if (g.expectedCheckoutDate > filters.expectedCheckoutDateTo) return false;
      }
      
      return true;
    });
  }, [guests, filters]);

  const checkoutMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const response = await apiRequest("POST", "/api/guests/checkout", { id: guestId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      toast({
        title: "Success",
        description: "Guest checked out successfully",
      });
    },
    onError: (error: any) => {
      // Check if the error indicates the guest was already checked out
      const errorMessage = error?.message || '';
      const isAlreadyCheckedOut = errorMessage.includes('already') || errorMessage.includes('not found') || errorMessage.includes('checked out');
      
      if (isAlreadyCheckedOut) {
        toast({
          title: "Guest Already Checked Out",
          description: "This guest has already been checked out. The page will refresh in a moment to update the list.",
          variant: "default",
        });
        // Auto-refresh after showing the message
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ["/api/guests/checked-in"] });
          queryClient.refetchQueries({ queryKey: ["/api/occupancy"] });
        }, 2000);
      } else {
        toast({
          title: "Error",
          description: "Failed to check out guest",
          variant: "destructive",
        });
      }
    },
  });

  const bulkCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/guests/checkout-all", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      toast({ 
        title: "Success", 
        description: data.message || `Successfully checked out ${data.count} guests` 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to bulk checkout guests", 
        variant: "destructive" 
      });
    },
  });

  const handleCheckout = (guestId: string) => {
    checkoutMutation.mutate(guestId);
  };

  const handleBulkCheckout = () => {
    setShowBulkCheckoutConfirmation(true);
  };

  const confirmBulkCheckout = () => {
    bulkCheckoutMutation.mutate();
    setShowBulkCheckoutConfirmation(false);
  };

  // Check for guests checking out today (expected checkout date is today)
  const today = new Date().toISOString().split('T')[0];
  const checkingOutToday = guests.filter(guest => 
    guest.expectedCheckoutDate === today
  );

  // Check for guests past their expected checkout
  const overdueCheckouts = guests.filter(guest => {
    if (!guest.expectedCheckoutDate) return false;
    return guest.expectedCheckoutDate < today;
  });

  // Render functions for different view modes
  const renderTableView = () => {
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>{labels.singular}</TableHead>
              <TableHead>Check-in Time</TableHead>
              <TableHead>Duration</TableHead>
              {!isCondensedView && (
                <>
                  <TableHead>Expected Checkout</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </>
              )}
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.map((guest) => {
              const genderIcon = getGenderIcon(guest.gender || undefined);
              const isGuestCheckingOut = checkoutMutation.isPending && checkoutMutation.variables === guest.id;
              const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
              const isToday = guest.expectedCheckoutDate === today;
              
              return (
                <TableRow key={guest.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isToday ? 'bg-orange-50' : ''}`}>
                  <TableCell>
                    <div className="flex items-center">
                      <div className={`w-10 h-10 ${genderIcon.bgColor} rounded-full flex items-center justify-center mr-4`}>
                        <span className={`${genderIcon.textColor} font-medium`}>
                          {genderIcon.icon || getInitials(guest.name)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-hostel-text">{guest.name}</div>
                        <div className="text-sm text-gray-500">ID: #{guest.id.slice(0, 8)}</div>
                        {guest.nationality && (
                          <div className="text-xs text-gray-400">{guest.nationality}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                      {guest.capsuleNumber}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(guest.checkinTime).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-hostel-text font-medium">{formatDuration(guest.checkinTime.toString())}</div>
                    <div className="text-xs text-gray-500">Since check-in</div>
                  </TableCell>
                  {!isCondensedView && (
                    <>
                      <TableCell className="text-sm text-gray-600">
                        {guest.expectedCheckoutDate ? (
                          <div>
                            <span className={`font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                              {new Date(guest.expectedCheckoutDate).toLocaleDateString()}
                            </span>
                            {isOverdue && <div className="text-xs text-red-500">Overdue</div>}
                            {isToday && <div className="text-xs text-orange-500">Today</div>}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {guest.paymentAmount ? (
                          <div>
                            <div className="font-medium">RM {guest.paymentAmount}</div>
                            <div className="text-xs text-gray-500">{guest.paymentCollector || 'N/A'}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">No payment</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 ${isGuestPaid(guest) ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                          <span className="text-xs text-gray-600">{isGuestPaid(guest) ? 'Paid' : 'Unpaid'}</span>
                        </div>
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCheckout(guest.id)}
                      disabled={checkoutMutation.isPending}
                      isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                      className="text-hostel-error hover:text-red-700 font-medium p-1"
                      title="Checkout"
                    >
                      <UserMinus className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGuests.map((guest) => {
          const genderIcon = getGenderIcon(guest.gender || undefined);
          const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
          const isToday = guest.expectedCheckoutDate === today;
          
          return (
            <div key={guest.id} className={`flex items-center justify-between rounded-md border px-3 py-2 ${
              isOverdue ? 'border-red-200 bg-red-50' : 
              isToday ? 'border-orange-200 bg-orange-50' : 
              'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 ${genderIcon.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className={`${genderIcon.textColor} text-xs font-medium`}>
                    {genderIcon.icon || getInitials(guest.name)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white text-xs`}>
                      {guest.capsuleNumber}
                    </Badge>
                    <span className="font-medium text-sm truncate">{guest.name}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {formatDuration(guest.checkinTime.toString())}
                    {!isCondensedView && guest.paymentAmount && (
                      <span className="ml-2">• RM {guest.paymentAmount}</span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCheckout(guest.id)}
                disabled={checkoutMutation.isPending}
                className="text-hostel-error hover:text-red-700 ml-2"
                title="Checkout"
              >
                <UserMinus className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCardView = () => {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredGuests.map((guest) => {
          const genderIcon = getGenderIcon(guest.gender || undefined);
          const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
          const isToday = guest.expectedCheckoutDate === today;
          
          return (
            <Card key={guest.id} className={`hover:shadow-md transition-shadow ${
              isOverdue ? 'border-red-200 bg-red-50' : 
              isToday ? 'border-orange-200 bg-orange-50' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${genderIcon.bgColor} rounded-full flex items-center justify-center`}>
                      <span className={`${genderIcon.textColor} font-medium`}>
                        {genderIcon.icon || getInitials(guest.name)}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{guest.name}</div>
                      <div className="text-xs text-gray-500">ID: #{guest.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                    {guest.capsuleNumber}
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">Duration:</span>
                    <span className="ml-1">{formatDuration(guest.checkinTime.toString())}</span>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">Check-in:</span>
                    <span className="ml-1 text-gray-600">
                      {new Date(guest.checkinTime).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </span>
                  </div>
                  
                  {guest.expectedCheckoutDate && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-800">Expected Out:</span>
                      <span className={`ml-1 ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-600'}`}>
                        {new Date(guest.expectedCheckoutDate).toLocaleDateString()}
                        {isOverdue && <span className="text-red-500 ml-1">(Overdue)</span>}
                        {isToday && <span className="text-orange-500 ml-1">(Today)</span>}
                      </span>
                    </div>
                  )}
                  
                  {guest.paymentAmount && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-800">Payment:</span>
                      <span className="ml-1">RM {guest.paymentAmount}</span>
                      {!isGuestPaid(guest) && <span className="text-red-500 ml-1">(Unpaid)</span>}
                    </div>
                  )}
                  
                  {guest.nationality && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-800">Nationality:</span>
                      <span className="ml-1 text-gray-600">{guest.nationality}</span>
                    </div>
                  )}
                </div>
                
                <Button 
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCheckout(guest.id)}
                  disabled={checkoutMutation.isPending}
                  isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  {checkoutMutation.isPending && checkoutMutation.variables === guest.id ? "Checking out..." : "Check Out"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="text-center">
            <div className="w-16 h-16 bg-hostel-error bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserMinus className="text-hostel-error h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-hostel-text">Guest Check-Out</CardTitle>
            <p className="text-gray-600 mt-2">Manage guest check-outs with detailed information</p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : !guestsResponse || guests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No guests currently checked in</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkCheckout}
                      disabled={bulkCheckoutMutation.isPending || guests.length === 0}
                      className="flex items-center gap-2"
                    >
                      <CheckCheck className="h-4 w-4" />
                      {bulkCheckoutMutation.isPending ? "Checking Out..." : "Check Out All"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* View Mode Switcher */}
                    <div className="flex items-center gap-1 mr-2">
                      <Button 
                        variant={viewMode === 'card' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setViewMode('card')}
                        className="px-2"
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Card
                      </Button>
                      <Button 
                        variant={viewMode === 'list' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setViewMode('list')}
                        className="px-2"
                      >
                        <List className="h-4 w-4 mr-1" />
                        List
                      </Button>
                      <Button 
                        variant={viewMode === 'table' ? 'default' : 'outline'} 
                        size="sm" 
                        onClick={() => setViewMode('table')}
                        className="px-2"
                      >
                        <TableIcon className="h-4 w-4 mr-1" />
                        Table
                      </Button>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 gap-2">
                          <FilterIcon className="h-4 w-4" />
                          Filter Guests
                          {hasActiveGuestFilters && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-600" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96" align="end">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Gender</Label>
                            <RadioGroup
                              value={filters.gender}
                              onValueChange={(val) => setFilters(prev => ({ ...prev, gender: val as any }))}
                              className="grid grid-cols-3 gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem id="co-gender-any" value="any" />
                                <Label htmlFor="co-gender-any">Any</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem id="co-gender-male" value="male" />
                                <Label htmlFor="co-gender-male">Male</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem id="co-gender-female" value="female" />
                                <Label htmlFor="co-gender-female">Female</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Nationality (General)</Label>
                            <RadioGroup
                              value={filters.nationality}
                              onValueChange={(val) => setFilters(prev => ({ ...prev, nationality: val as any }))}
                              className="grid grid-cols-3 gap-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem id="co-nat-any" value="any" />
                                <Label htmlFor="co-nat-any">Any</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem id="co-nat-my" value="malaysian" />
                                <Label htmlFor="co-nat-my">Malaysian</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem id="co-nat-nonmy" value="non-malaysian" />
                                <Label htmlFor="co-nat-nonmy">Non‑MY</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Specific Nationality</Label>
                            <Select value={filters.specificNationality} onValueChange={(val) => setFilters(prev => ({ ...prev, specificNationality: val }))}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select nationality" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any nationality</SelectItem>
                                {availableNationalities.map((nationality) => (
                                  <SelectItem key={nationality} value={nationality}>
                                    {nationality}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Capsule Assignment</Label>
                            <Select value={filters.capsuleNumber} onValueChange={(val) => setFilters(prev => ({ ...prev, capsuleNumber: val }))}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select capsule" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="any">Any capsule</SelectItem>
                                {uniqueCapsules.map((capsule) => (
                                  <SelectItem key={capsule} value={capsule}>
                                    Capsule {capsule}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Length of Stay (Days)</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs text-gray-500">Min days</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Min"
                                  value={filters.lengthOfStayMin}
                                  onChange={(e) => setFilters(prev => ({ ...prev, lengthOfStayMin: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-500">Max days</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="Max"
                                  value={filters.lengthOfStayMax}
                                  onChange={(e) => setFilters(prev => ({ ...prev, lengthOfStayMax: e.target.value }))}
                                  className="h-8 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Date Filters</Label>
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Check-in Date Range</Label>
                                <div className="space-y-2">
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCheckinDateShortcut('yesterday')}
                                      className="text-xs h-6 px-2"
                                    >
                                      Yesterday
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCheckinDateShortcut('today')}
                                      className="text-xs h-6 px-2"
                                    >
                                      Today
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCheckinDateShortcut('tomorrow')}
                                      className="text-xs h-6 px-2"
                                    >
                                      Tomorrow
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs text-gray-500">From</Label>
                                      <Input
                                        type="date"
                                        value={filters.checkinDateFrom}
                                        onChange={(e) => setFilters(prev => ({ ...prev, checkinDateFrom: e.target.value }))}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-500">To</Label>
                                      <Input
                                        type="date"
                                        value={filters.checkinDateTo}
                                        onChange={(e) => setFilters(prev => ({ ...prev, checkinDateTo: e.target.value }))}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Expected Check-out Date Range</Label>
                                <div className="space-y-2">
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setExpectedCheckoutDateShortcut('yesterday')}
                                      className="text-xs h-6 px-2"
                                    >
                                      Yesterday
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setExpectedCheckoutDateShortcut('today')}
                                      className="text-xs h-6 px-2"
                                    >
                                      Today
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setExpectedCheckoutDateShortcut('tomorrow')}
                                      className="text-xs h-6 px-2"
                                    >
                                      Tomorrow
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs text-gray-500">From</Label>
                                      <Input
                                        type="date"
                                        value={filters.expectedCheckoutDateFrom}
                                        onChange={(e) => setFilters(prev => ({ ...prev, expectedCheckoutDateFrom: e.target.value }))}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs text-gray-500">To</Label>
                                      <Input
                                        type="date"
                                        value={filters.expectedCheckoutDateTo}
                                        onChange={(e) => setFilters(prev => ({ ...prev, expectedCheckoutDateTo: e.target.value }))}
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs uppercase text-gray-500">Quick filters</Label>
                            <div className="flex flex-col gap-2">
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={filters.outstandingOnly}
                                  onCheckedChange={(val) => setFilters(prev => ({ ...prev, outstandingOnly: Boolean(val) }))}
                                />
                                Outstanding payment only
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={filters.checkoutTodayOnly}
                                  onCheckedChange={(val) => setFilters(prev => ({ ...prev, checkoutTodayOnly: Boolean(val) }))}
                                />
                                Expected to check out today
                              </label>
                            </div>
                          </div>
                          <div className="flex justify-between pt-2">
                            <Button variant="ghost" size="sm" onClick={() => setFilters({ 
                              gender: 'any', 
                              nationality: 'any',
                              specificNationality: 'any',
                              capsuleNumber: 'any',
                              lengthOfStayMin: '',
                              lengthOfStayMax: '',
                              outstandingOnly: false, 
                              checkoutTodayOnly: false,
                              checkinDateFrom: '',
                              checkinDateTo: '',
                              expectedCheckoutDateFrom: '',
                              expectedCheckoutDateTo: ''
                            })}>
                              Clear All Filters
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    {/* Mobile: icons with tooltips */}
                    <div className="sm:hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ToggleLeft className="h-4 w-4 text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Condensed</TooltipContent>
                      </Tooltip>
                    </div>
                    {/* Desktop: text label */}
                    <span className="hidden sm:inline text-xs text-gray-600">Condensed</span>
                    <Switch 
                      checked={!isCondensedView}
                      onCheckedChange={(checked) => setIsCondensedView(!checked)}
                    />
                    {/* Desktop: text label */}
                    <span className="hidden sm:inline text-xs text-gray-600">Detailed</span>
                    {/* Mobile: icons with tooltips */}
                    <div className="sm:hidden">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <ToggleRight className="h-4 w-4 text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Detailed</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic View Rendering */}
              <div>
                {(() => {
                  switch (viewMode) {
                    case 'table':
                      return renderTableView();
                    case 'list':
                      return renderListView();
                    case 'card':
                      return renderCardView();
                    default:
                      return renderTableView();
                  }
                })()}
              </div>

              {/* Summary Information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">{guests.length}</div>
                        <div className="text-sm text-gray-600">Total Checked In</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The total number of guests currently checked in.</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">{checkingOutToday.length}</div>
                        <div className="text-sm text-gray-600">Expected Today</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Guests whose expected check-out date is today.</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <div className="text-2xl font-bold text-red-600">{overdueCheckouts.length}</div>
                        <div className="text-sm text-gray-600">Overdue</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Guests who have passed their expected check-out date.</p>
                    </TooltipContent>
                  </Tooltip>
                  
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bulk Checkout Confirmation Dialog */}
      <ConfirmationDialog
        open={showBulkCheckoutConfirmation}
        onOpenChange={setShowBulkCheckoutConfirmation}
        title="Check Out All Guests"
        description={`Are you sure you want to check out all ${guests.length} currently checked-in guests? This action cannot be undone.`}
        confirmText="Check Out All"
        cancelText="Cancel"
        onConfirm={confirmBulkCheckout}
        variant="warning"
        icon={<UserMinus className="h-6 w-6 text-orange-600" />}
        isLoading={bulkCheckoutMutation.isPending}
      />
    </div>
  );
}
