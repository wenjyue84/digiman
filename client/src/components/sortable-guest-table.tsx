import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus, ArrowUpDown, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, ChevronLeft, Copy, Filter as FilterIcon, CalendarPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import GuestDetailsModal from "./guest-details-modal";
import ExtendStayDialog from "./ExtendStayDialog";
import { CheckoutConfirmationDialog } from "./confirmation-dialog";
import type { Guest, GuestToken, PaginatedResponse } from "@shared/schema";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getInitials,
  truncateName,
  getFirstInitial,
  getGenderIcon,
  formatShortDateTime,
  formatShortDate,
  ROW_HEIGHT
} from "@/components/guest-table/utils";
import { SortButton } from "@/components/guest-table/SortButton";
import { SwipeableGuestRow } from "@/components/guest-table/SwipeableGuestRow";
import { SwipeableGuestCard } from "@/components/guest-table/SwipeableGuestCard";
import { DesktopRow } from "@/components/guest-table/DesktopRow";
import { getGuestBalance, isGuestPaid } from "@/lib/guest";

type SortField = 'name' | 'capsuleNumber' | 'checkinTime' | 'expectedCheckoutDate';
type SortOrder = 'asc' | 'desc';

export default function SortableGuestTable() {
  const queryClient = useQueryClient();
  const labels = useAccommodationLabels();
  const isMobile = useIsMobile();
  const [isCondensedView, setIsCondensedView] = useState(() => isMobile);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [extendGuest, setExtendGuest] = useState<Guest | null>(null);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const { toast } = useToast();

  // Auto-switch view mode based on device type
  useEffect(() => {
    setIsCondensedView(isMobile);
  }, [isMobile]);
  const { isAuthenticated } = useAuth();
  const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({
    field: 'capsuleNumber',
    order: 'asc'
  });
  
  const { data: guestsResponse, isLoading } = useVisibilityQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
    // Uses smart config: realtime (10s stale, 30s refetch)
  });
  
  const guests = guestsResponse?.data || [];

  const { data: occupancy } = useVisibilityQuery<{total: number; occupied: number; available: number}>({
    queryKey: ["/api/occupancy"],
    // Uses smart config: realtime (10s stale, 30s refetch)
  });

  const { data: activeTokensResponse } = useVisibilityQuery<PaginatedResponse<{
    id: string;
    token: string;
    capsuleNumber: string;
    guestName: string | null;
    phoneNumber: string | null;
    createdAt: string;
    expiresAt: string;
  }>>({
    queryKey: ["/api/guest-tokens/active"],
    // Uses smart config: nearRealtime (30s stale, 60s refetch)
  });
  
  const activeTokens = activeTokensResponse?.data || [];

  // Filters
  const [filters, setFilters] = useState({
    gender: 'any' as 'any' | 'male' | 'female',
    nationality: 'any' as 'any' | 'malaysian' | 'non-malaysian',
    outstandingOnly: false,
    checkoutTodayOnly: false,
  });

  const hasActiveGuestFilters = filters.gender !== 'any' || filters.nationality !== 'any' || filters.outstandingOnly || filters.checkoutTodayOnly;

  const calculatePlannedStayDays = (checkinTime: string | Date, expectedCheckoutDate?: string | Date | null): number => {
    try {
      if (!expectedCheckoutDate) return 0;
      const checkin = new Date(checkinTime);
      const plannedCheckout = new Date(expectedCheckoutDate);
      const diffMs = plannedCheckout.getTime() - checkin.getTime();
      if (Number.isNaN(diffMs)) return 0;
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const isDateToday = (dateStr?: string) => {
    if (!dateStr) return false;
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      // dateStr in DB is often YYYY-MM-DD; fallback to local date string compare
      return dateStr.slice(0, 10) === todayStr;
    } catch {
      return false;
    }
  };

  // Create a combined list of guests and pending check-ins
  const combinedData = useMemo(() => {
    const guestData = guests.map(guest => ({ type: 'guest' as const, data: guest }));
    const pendingData = activeTokens.map(token => ({ 
      type: 'pending' as const, 
      data: {
        id: token.id,
        name: token.guestName || 'Pending Check-in',
        capsuleNumber: token.capsuleNumber,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        phoneNumber: token.phoneNumber,
      }
    }));
    
    return [...guestData, ...pendingData];
  }, [guests, activeTokens]);

  const filteredData = useMemo(() => {
    if (!combinedData.length) return [];
    return combinedData.filter(item => {
      if (item.type !== 'guest') {
        // Hide pending rows when any guest-specific filter is active
        return !hasActiveGuestFilters;
      }
      const g = item.data as Guest;
      if (filters.gender !== 'any' && g.gender !== filters.gender) return false;
      if (filters.nationality === 'malaysian' && g.nationality !== 'Malaysian') return false;
      if (filters.nationality === 'non-malaysian' && g.nationality === 'Malaysian') return false;
      if (filters.outstandingOnly && isGuestPaid(g)) return false;
      if (filters.checkoutTodayOnly) {
        if (!g.expectedCheckoutDate) return false;
        if (!isDateToday(g.expectedCheckoutDate)) return false;
      }
      return true;
    });
  }, [combinedData, filters, hasActiveGuestFilters]);

  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];
    
    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortConfig.field) {
        case 'name':
          aValue = (a.type === 'guest' ? a.data.name : a.data.name).toLowerCase();
          bValue = (b.type === 'guest' ? b.data.name : b.data.name).toLowerCase();
          break;
        case 'capsuleNumber':
          // Extract number for proper sorting (C1, C2, C11, C12, etc.)
          // Handle null capsuleNumbers by putting them at the end
          aValue = a.data.capsuleNumber ? parseInt(a.data.capsuleNumber.replace('C', '')) : 999999;
          bValue = b.data.capsuleNumber ? parseInt(b.data.capsuleNumber.replace('C', '')) : 999999;
          break;
        case 'checkinTime':
          aValue = a.type === 'guest' ? new Date(a.data.checkinTime).getTime() : new Date(a.data.createdAt).getTime();
          bValue = b.type === 'guest' ? new Date(b.data.checkinTime).getTime() : new Date(b.data.createdAt).getTime();
          break;
        case 'expectedCheckoutDate':
          aValue = a.type === 'guest' 
            ? (a.data.expectedCheckoutDate ? new Date(a.data.expectedCheckoutDate).getTime() : 0)
            : new Date(a.data.expiresAt).getTime();
          bValue = b.type === 'guest' 
            ? (b.data.expectedCheckoutDate ? new Date(b.data.expectedCheckoutDate).getTime() : 0)
            : new Date(b.data.expiresAt).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.order === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

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
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/cleaning-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({
        title: "Success",
        description: "Guest checked out successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check out guest",
        variant: "destructive",
      });
    },
  });

  const cancelTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await apiRequest("DELETE", `/api/guest-tokens/${tokenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-tokens/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      toast({
        title: "Success",
        description: "Pending check-in cancelled successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel pending check-in",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = (guestId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to check out guests. Redirecting to login page...",
        variant: "destructive",
        duration: 3000,
      });
      
      // Redirect to login page after a brief delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      
      return;
    }
    
    // Find the guest to show in confirmation dialog
    const guest = guests.find(g => g.id === guestId);
    if (guest) {
      setCheckoutGuest(guest);
      setShowCheckoutConfirmation(true);
    }
  };

  const confirmCheckout = () => {
    if (checkoutGuest) {
      checkoutMutation.mutate(checkoutGuest.id);
      setShowCheckoutConfirmation(false);
      setCheckoutGuest(null);
    }
  };

  const handleCancelToken = (tokenId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to cancel pending check-ins. Redirecting to login page...",
        variant: "destructive",
        duration: 3000,
      });
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      
      return;
    }
    
    cancelTokenMutation.mutate(tokenId);
  };

  const handleGuestClick = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsDetailsModalOpen(true);
  };

  const handleExtend = (guest: Guest) => {
    setExtendGuest(guest);
    setIsExtendOpen(true);
  };

  const handleCloseModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedGuest(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Check-in link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  const getCheckinLink = (token: string) => {
    return `${window.location.origin}/guest-checkin?token=${token}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Currently Checked In</CardTitle>
            <Skeleton className="w-20 h-6" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="w-8 h-8 rounded-full" />
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-bold text-hostel-text flex items-center">
            Current Guest
            {occupancy && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({occupancy.occupied}/{occupancy.total})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <FilterIcon className="h-4 w-4" />
                  Filter Guests
                  {hasActiveGuestFilters && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-600" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-gray-500">Gender</Label>
                    <RadioGroup
                      value={filters.gender}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, gender: val as any }))}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="gender-any" value="any" />
                        <Label htmlFor="gender-any">Any</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="gender-male" value="male" />
                        <Label htmlFor="gender-male">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="gender-female" value="female" />
                        <Label htmlFor="gender-female">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-gray-500">Nationality</Label>
                    <RadioGroup
                      value={filters.nationality}
                      onValueChange={(val) => setFilters(prev => ({ ...prev, nationality: val as any }))}
                      className="grid grid-cols-3 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="nat-any" value="any" />
                        <Label htmlFor="nat-any">Any</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="nat-my" value="malaysian" />
                        <Label htmlFor="nat-my">Malaysian</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="nat-nonmy" value="non-malaysian" />
                        <Label htmlFor="nat-nonmy">Non‑MY</Label>
                      </div>
                    </RadioGroup>
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
                    <Button variant="ghost" size="sm" onClick={() => setFilters({ gender: 'any', nationality: 'any', outstandingOnly: false, checkoutTodayOnly: false })}>
                      Clear
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {/* Mobile: icons with tooltips */}
            <div className="md:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleLeft className="h-4 w-4 text-gray-600" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Condensed</TooltipContent>
              </Tooltip>
            </div>
            {/* Desktop: text label */}
            <span className="hidden md:inline text-xs text-gray-600">Condensed</span>
            <Switch 
              checked={!isCondensedView}
              onCheckedChange={(checked) => setIsCondensedView(!checked)}
            />
            {/* Desktop: text label */}
            <span className="hidden md:inline text-xs text-gray-600">Detailed</span>
            {/* Mobile: icons with tooltips */}
            <div className="md:hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleRight className="h-4 w-4 text-gray-600" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Detailed</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No guests currently checked in or pending check-ins</p>
          </div>
        ) : (
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    <div className="flex items-center gap-1">
                      {labels.singular}
                      <SortButton field="capsuleNumber" currentSort={sortConfig} onSort={handleSort} />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  {!isCondensedView && (
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                  )}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      {isCondensedView ? 'In' : 'Check-in'}
                      <SortButton field="checkinTime" currentSort={sortConfig} onSort={handleSort} />
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      {isCondensedView ? 'Out' : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">Checkout</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Expected checkout date/time</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <SortButton field="expectedCheckoutDate" currentSort={sortConfig} onSort={handleSort} />
                    </div>
                  </th>
                  {!isCondensedView && (
                    <>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((item) => {
                  if (item.type === 'guest') {
                    const guest = item.data;
                    const genderIcon = getGenderIcon(guest.gender || undefined);
                    const isGuestCheckingOut = checkoutMutation.isPending && checkoutMutation.variables === guest.id;
                    const stayDays = calculatePlannedStayDays(guest.checkinTime, guest.expectedCheckoutDate);
                    return (
                      <SwipeableGuestRow
                        key={guest.id}
                        guest={guest}
                        onCheckout={handleCheckout}
                        onGuestClick={handleGuestClick}
                        onExtend={handleExtend}
                        isCondensedView={isCondensedView}
                        isMobile={isMobile}
                        isCheckingOut={isGuestCheckingOut}
                      >
                        {/* Accommodation column - sticky first column */}
                        <td className="px-2 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                          <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                            {guest.capsuleNumber}
                          </Badge>
                        </td>
                        {/* Guest column */
                        }
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-6 h-6 ${genderIcon.bgColor} rounded-full flex items-center justify-center mr-2`}>
                              {isCondensedView ? (
                                <span className={`${genderIcon.textColor} font-bold text-xs`}>
                                  {getFirstInitial(guest.name)}
                                </span>
                              ) : genderIcon.icon ? (
                                <span className={`${genderIcon.textColor} font-bold text-sm`}>{genderIcon.icon}</span>
                              ) : (
                                <span className={`${genderIcon.textColor} font-medium text-xs`}>{getInitials(guest.name)}</span>
                              )}
                            </div>
                              {!isCondensedView && (
                                <>
                                  <button
                                    onClick={() => handleGuestClick(guest)}
                                    className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${stayDays >= 7 ? 'text-amber-800 bg-amber-50 rounded px-1' : 'text-hostel-text hover:text-orange-700'}`}
                                  >
                                    {isMobile ? truncateName(guest.name) : guest.name}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        {/* Nationality column - only in detailed view */}
                        {!isCondensedView && (
                          <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                            {guest.nationality ? (
                              <span className="font-medium">{guest.nationality}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        {/* Check-in column */}
                        <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                          {isCondensedView 
                            ? formatShortDate(guest.checkinTime.toString())
                            : formatShortDateTime(guest.checkinTime.toString())
                          }
                        </td>
                        {/* Checkout column */}
                        <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                          {guest.expectedCheckoutDate ? (
                            <span className="font-medium">
                              {formatShortDate(guest.expectedCheckoutDate)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        {/* Payment and Status columns - only in detailed view */}
                        {!isCondensedView && (
                          <>
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                              {guest.paymentAmount ? (
                                <div>
                                  <div className={`font-medium ${isGuestPaid(guest) ? '' : 'text-red-600'}`}>
                                    RM {guest.paymentAmount}
                                    {!isGuestPaid(guest) && getGuestBalance(guest) > 0 && (
                                      <span className="text-red-600 text-xs font-medium ml-1">
                                        (Balance: RM{getGuestBalance(guest)})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">{guest.paymentCollector || 'N/A'}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">No payment</span>
                              )}
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </td>
                          </>
                        )}
                        {/* Actions column */}
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline"
                              size="sm"
                              onClick={() => handleExtend(guest)}
                              className="text-green-700 border-green-600 hover:bg-green-50 font-medium p-1"
                              title="Extend"
                            >
                              <CalendarPlus className="h-3 w-3" />
                            </Button>
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
                          </div>
                        </td>
                      </SwipeableGuestRow>
                    );
                  } else {
                    // Pending check-in row
                    const pendingData = item.data;
                    return (
                      <tr key={`pending-${pendingData.id}`} className="bg-orange-50">
                        {/* Accommodation column with copy icon - sticky first column */}
                        <td className="px-2 py-3 whitespace-nowrap sticky left-0 bg-orange-50 z-10">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="bg-orange-500 text-white border-orange-500">
                              {pendingData.capsuleNumber}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(getCheckinLink(activeTokens.find(t => t.id === pendingData.id)?.token || ''))}
                              className="text-blue-600 hover:text-blue-800 font-medium p-1 text-xs"
                              title="Copy check-in link"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        {/* Guest column */}
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                              <span className="text-orange-600 font-bold text-sm">P</span>
                            </div>
                            {!isCondensedView && (
                              <span className="text-sm font-medium text-orange-700">
                                {pendingData.name}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Nationality column - only in detailed view */}
                        {!isCondensedView && (
                          <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                            Pending
                          </td>
                        )}
                        {/* Check-in column - show creation time */}
                        <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                          {isCondensedView 
                            ? formatShortDate(pendingData.createdAt)
                            : formatShortDateTime(pendingData.createdAt)
                          }
                        </td>
                        {/* Checkout column - show expiration */}
                        <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                          <span className="font-medium">
                            Expires {formatShortDate(pendingData.expiresAt)}
                          </span>
                        </td>
                        {/* Payment and Status columns - only in detailed view */}
                        {!isCondensedView && (
                          <>
                            <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                              Awaiting self check-in
                            </td>
                            <td className="px-2 py-3 whitespace-nowrap">
                              <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 font-bold text-xs">P</span>
                              </div>
                            </td>
                          </>
                        )}
                        {/* Actions column */}
                        <td className="px-2 py-3 whitespace-nowrap">
                          {isAuthenticated ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCancelToken(pendingData.id)}
                              disabled={cancelTokenMutation.isPending}
                              className="text-orange-600 hover:text-orange-800 font-medium p-1 text-xs"
                            >
                              {cancelTokenMutation.isPending ? 'Cancelling...' : 'Cancel'}
                            </Button>
                          ) : (
                            <span className="text-xs text-orange-600">Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>

            </table>
          </div>
        )}

        {/* Mobile card view */}
        {sortedData.length > 0 && (
          <div className="md:hidden space-y-3">
            {sortedData.map((item) => {
              if (item.type === 'guest') {
                const guest = item.data as Guest;
                const isGuestCheckingOut = checkoutGuest?.id === guest.id;
                const genderIcon = getGenderIcon(guest.gender || undefined);
                return (
                  <Card key={`guest-${guest.id}`} className="p-0 overflow-hidden hover-card-pop">
                    <SwipeableGuestCard
                      guest={guest}
                      onCheckout={handleCheckout}
                      onExtend={handleExtend}
                      isCheckingOut={isGuestCheckingOut}
                    >
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${genderIcon.bgColor} rounded-full flex items-center justify-center text-sm font-semibold ${genderIcon.textColor}`}>
                          {getFirstInitial(guest.name)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">{guest.capsuleNumber}</Badge>
                            <button onClick={() => handleGuestClick(guest)} className="font-medium hover:underline focus:outline-none">
                              {guest.name}
                            </button>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            In: {formatShortDateTime(guest.checkinTime.toString())}
                            {guest.expectedCheckoutDate && (
                              <span className="ml-2">Out: {formatShortDate(guest.expectedCheckoutDate)}</span>
                            )}
                          </div>
                          {!isCondensedView && (
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                              <div>
                                <span className="font-medium text-gray-800">Nationality:</span> {guest.nationality || '—'}
                              </div>
                              <div>
                                <span className="font-medium text-gray-800">Phone:</span> {guest.phoneNumber || '—'}
                              </div>
                              <div className="col-span-2 flex flex-wrap items-center gap-2">
                                <span className="font-medium text-gray-800">Payment:</span>
                                <span className={isGuestPaid(guest) ? '' : 'text-red-600 font-semibold'}>RM {guest.paymentAmount}</span>
                                {guest.paymentMethod && <span>• {guest.paymentMethod.toUpperCase()}</span>}
                                <Badge variant={isGuestPaid(guest) ? 'default' : 'destructive'}>{isGuestPaid(guest) ? 'Paid' : 'Outstanding'}</Badge>
                                {!isGuestPaid(guest) && getGuestBalance(guest) > 0 && (
                                  <span className="text-red-600 text-xs font-medium">
                                    Balance: RM{getGuestBalance(guest)}
                                  </span>
                                )}
                              </div>
                              {guest.paymentCollector && (
                                <div className="col-span-2">
                                  <span className="font-medium text-gray-800">Collected by:</span> {guest.paymentCollector}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          className="h-11 w-11 rounded-full"
                          onClick={() => handleCheckout(guest.id)}
                          disabled={isGuestCheckingOut}
                          title="Checkout"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    </SwipeableGuestCard>
                  </Card>
                );
              } else {
                const pendingData = item.data;
                return (
                  <Card key={`pending-${pendingData.id}`} className="p-3 bg-orange-50/60 hover-card-pop">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-sm font-semibold text-orange-600">
                          P
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-orange-500 text-white border-orange-500">{pendingData.capsuleNumber}</Badge>
                            <span className="font-medium">{pendingData.name}</span>
                          </div>
                          <div className="text-xs text-orange-700 mt-1">
                            In: {formatShortDateTime(pendingData.createdAt)}
                            <span className="ml-2">Expires: {formatShortDate(pendingData.expiresAt)}</span>
                          </div>
                          {!isCondensedView && (
                            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-orange-700">
                              <div className="col-span-2">
                                <span className="font-medium">Status:</span> Awaiting self check-in
                              </div>
                              {pendingData.phoneNumber && (
                                <div className="col-span-2">
                                  <span className="font-medium">Phone:</span> {pendingData.phoneNumber}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getCheckinLink(activeTokens.find(t => t.id === pendingData.id)?.token || ''))}
                          className="h-11 w-11 rounded-full text-blue-600 hover:text-blue-800"
                          title="Copy check-in link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {isAuthenticated ? (
                          <Button 
                            variant="outline"
                            className="h-11 px-4 rounded-full"
                            onClick={() => cancelTokenMutation.mutate(pendingData.id)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-xs text-orange-600">Pending</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              }
            })}
          </div>
        )}
      </CardContent>
      
      <GuestDetailsModal 
        guest={selectedGuest}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseModal}
      />

      <ExtendStayDialog
        guest={extendGuest}
        open={isExtendOpen}
        onOpenChange={(open) => {
          setIsExtendOpen(open);
          if (!open) setExtendGuest(null);
        }}
      />

      {/* Checkout Confirmation Dialog */}
      {checkoutGuest && (
        <CheckoutConfirmationDialog
          open={showCheckoutConfirmation}
          onOpenChange={setShowCheckoutConfirmation}
          onConfirm={confirmCheckout}
          guestName={checkoutGuest.name}
          capsuleNumber={checkoutGuest.capsuleNumber}
          isLoading={checkoutMutation.isPending}
        />
      )}
    </Card>
  );
}
