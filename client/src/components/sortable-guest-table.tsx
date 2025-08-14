import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus, ArrowUpDown, ArrowUp, ArrowDown, ToggleLeft, ToggleRight, ChevronLeft, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import GuestDetailsModal from "./guest-details-modal";
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
  formatShortDate
} from "@/components/guest-table/utils";
import { SortButton } from "@/components/guest-table/SortButton";
import { SwipeableGuestRow } from "@/components/guest-table/SwipeableGuestRow";
// Removed virtualization-based DesktopRow to maintain consistent column alignment

type SortField = 'name' | 'capsuleNumber' | 'checkinTime' | 'expectedCheckoutDate';
type SortOrder = 'asc' | 'desc';

export default function SortableGuestTable() {
  const queryClient = useQueryClient();
  const labels = useAccommodationLabels();
  const isMobile = useIsMobile();
  const [isCondensedView, setIsCondensedView] = useState(() => isMobile);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
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

  const sortedData = useMemo(() => {
    if (!combinedData.length) return [];
    
    return [...combinedData].sort((a, b) => {
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
  }, [combinedData, sortConfig]);

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
            Dashboard
            {occupancy && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({occupancy.available}/{occupancy.total})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
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
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copy Link</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((item) => {
                  if (item.type === 'guest') {
                    const guest = item.data;
                    const genderIcon = getGenderIcon(guest.gender || undefined);
                    const isGuestCheckingOut = checkoutMutation.isPending && checkoutMutation.variables === guest.id;
                    return (
                      <SwipeableGuestRow
                        key={guest.id}
                        guest={guest}
                        onCheckout={handleCheckout}
                        onGuestClick={handleGuestClick}
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
                        {/* Guest column */}
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
                                <button
                                  onClick={() => handleGuestClick(guest)}
                                  className="text-sm font-medium text-hostel-text hover:text-orange-700 hover:underline cursor-pointer transition-colors"
                                >
                                  {isMobile ? truncateName(guest.name) : guest.name}
                                </button>
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
                                  <div className={`font-medium ${guest.isPaid ? '' : 'text-red-600'}`}>
                                    RM {guest.paymentAmount}
                                    {!guest.isPaid && guest.notes && (
                                      <span className="text-red-600 text-xs font-medium ml-1">
                                        (Balance: RM{guest.notes.match(/RM(\d+)/)?.[1] || '0'})
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
                        {/* Copy Link column - show dash for checked-in guests */}
                        <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-400">
                          —
                        </td>
                        {/* Actions column */}
                        <td className="px-2 py-3 whitespace-nowrap">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCheckout(guest.id)}
                            disabled={checkoutMutation.isPending}
                            isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                            className="text-hostel-error hover:text-red-700 font-medium p-1"
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </td>
                      </SwipeableGuestRow>
                    );
                  } else {
                    // Pending check-in row
                    const pendingData = item.data;
                    return (
                      <tr key={`pending-${pendingData.id}`} className="bg-orange-50">
                        {/* Accommodation column - sticky first column */}
                        <td className="px-2 py-3 whitespace-nowrap sticky left-0 bg-orange-50 z-10">
                          <Badge variant="outline" className="bg-orange-500 text-white border-orange-500">
                            {pendingData.capsuleNumber}
                          </Badge>
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
                        {/* Copy Link column - show copy button for pending check-ins */}
                        <td className="px-2 py-3 whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(getCheckinLink(activeTokens.find(t => t.id === pendingData.id)?.token || ''))}
                            className="text-blue-600 hover:text-blue-800 font-medium p-1 text-xs"
                            title="Copy check-in link"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </td>
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
                  <Card key={`guest-${guest.id}`} className="p-3 hover-card-pop">
                    <div className="flex items-center justify-between gap-3">
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
                                <span className={guest.isPaid ? '' : 'text-red-600 font-semibold'}>RM {guest.paymentAmount}</span>
                                {guest.paymentMethod && <span>• {guest.paymentMethod.toUpperCase()}</span>}
                                <Badge variant={guest.isPaid ? 'default' : 'destructive'}>{guest.isPaid ? 'Paid' : 'Outstanding'}</Badge>
                                {!guest.isPaid && guest.notes && (
                                  <span className="text-red-600 text-xs font-medium">
                                    Balance: RM{guest.notes.match(/RM(\d+)/)?.[1] || '0'}
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
                        <div className="h-11 w-11 rounded-full flex items-center justify-center text-gray-400 text-xs">
                          —
                        </div>
                        <Button 
                          variant="ghost" 
                          className="h-11 w-11 rounded-full"
                          onClick={() => handleGuestClick(guest)}
                          title="Details"
                        >
                          i
                        </Button>
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
