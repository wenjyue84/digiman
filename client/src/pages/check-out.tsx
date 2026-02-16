import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus, CheckCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { pushNotificationManager } from "@/lib/pushNotifications";

import type { Guest, PaginatedResponse } from "@shared/schema";

import {
  CheckoutCardView,
  CheckoutListView,
  CheckoutTableView,
  CheckoutFilterBar,
  CheckoutViewSwitcher,
  useCheckoutFilters,
  useBulkCheckout,
} from "@/components/checkout";
import type { ViewMode } from "@/components/checkout";

export default function CheckOut() {
  const labels = useAccommodationLabels();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Condensed / detailed toggle
  const [isCondensedView, setIsCondensedView] = useState(() => isMobile);
  useEffect(() => { setIsCondensedView(isMobile); }, [isMobile]);

  // View mode (card / list / table) with localStorage persistence (US-002)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('checkout-view-mode');
    if (saved && ['card', 'list', 'table'].includes(saved)) {
      return saved as ViewMode;
    }
    return window.innerWidth < 640 ? 'card' : 'table';
  });
  useEffect(() => { localStorage.setItem('checkout-view-mode', viewMode); }, [viewMode]);

  // Data fetching
  const { data: guestsResponse, isLoading } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
  });
  const guests = guestsResponse?.data || [];

  // Filters hook
  const {
    filters,
    setFilters,
    hasActiveFilters,
    filteredGuests,
    uniqueCapsules,
    availableNationalities,
    setCheckinDateShortcut,
    setExpectedCheckoutDateShortcut,
    clearFilters,
  } = useCheckoutFilters(guests);

  // Bulk checkout hook
  const {
    bulkCheckoutMutation,
    showConfirmation,
    setShowConfirmation,
    handleBulkCheckout,
    confirmBulkCheckout,
  } = useBulkCheckout();

  // Mark capsule as cleaned (used in checkout success toast)
  const handleMarkCleaned = async (capsuleNumber: string) => {
    try {
      await apiRequest("POST", `/api/capsules/${capsuleNumber}/mark-cleaned`, {
        cleanedBy: "Staff",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      toast({
        title: "Success",
        description: `${labels.singular} ${capsuleNumber} marked as cleaned successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark capsule as cleaned",
        variant: "destructive",
      });
    }
  };

  // Individual checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async (guestId: string) => {
      const response = await apiRequest("POST", "/api/guests/checkout", { id: guestId });
      return response.json();
    },
    onSuccess: (_data, guestId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });

      const guest = guests.find(g => g.id === guestId);

      if (guest) {
        pushNotificationManager.showLocalNotification(
          "Guest Check-Out",
          {
            body: `${guest.name} has checked out from ${labels.capsule} ${guest.capsuleNumber}`,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: `checkout-${guestId}`,
            requireInteraction: false,
            data: {
              type: "checkout",
              guestId,
              guestName: guest.name,
              capsuleNumber: guest.capsuleNumber,
            },
          }
        ).catch(error => {
          console.log("Could not show notification:", error);
        });
      }

      toast({
        title: "Success",
        description: (
          <div className="space-y-2">
            <div>Guest checked out successfully</div>
            {guest && (
              <div className="text-sm text-gray-600">
                Next: go{' '}
                <button
                  onClick={() => window.location.href = '/cleaning'}
                  className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  Clean
                </button>{' '}
                section to{' '}
                <button
                  onClick={() => handleMarkCleaned(guest.capsuleNumber)}
                  className="text-green-600 hover:text-green-800 underline cursor-pointer font-medium"
                >
                  mark cleaned
                </button>
              </div>
            )}
          </div>
        ),
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || '';
      const isAlreadyCheckedOut = errorMessage.includes('already') || errorMessage.includes('not found') || errorMessage.includes('checked out');

      if (isAlreadyCheckedOut) {
        toast({
          title: "Guest Already Checked Out",
          description: "This guest has already been checked out. The page will refresh in a moment to update the list.",
          variant: "default",
        });
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

  const handleCheckout = (guestId: string) => {
    checkoutMutation.mutate(guestId);
  };

  // Summary statistics
  const today = new Date().toISOString().split('T')[0];
  const checkingOutToday = guests.filter(g => g.expectedCheckoutDate === today);
  const overdueCheckouts = guests.filter(g => g.expectedCheckoutDate && g.expectedCheckoutDate < today);

  // Shared props for view components
  const viewProps = {
    guests: filteredGuests,
    today,
    isCondensedView,
    checkoutMutation,
    onCheckout: handleCheckout,
    labels,
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
              {/* Bulk Actions & Controls */}
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
                    <CheckoutViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                    <CheckoutFilterBar
                      filters={filters}
                      setFilters={setFilters}
                      hasActiveFilters={hasActiveFilters}
                      uniqueCapsules={uniqueCapsules}
                      availableNationalities={availableNationalities}
                      setCheckinDateShortcut={setCheckinDateShortcut}
                      setExpectedCheckoutDateShortcut={setExpectedCheckoutDateShortcut}
                      clearFilters={clearFilters}
                    />
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

              {/* Active View */}
              <div>
                {viewMode === 'table' && <CheckoutTableView {...viewProps} />}
                {viewMode === 'list' && <CheckoutListView {...viewProps} />}
                {viewMode === 'card' && <CheckoutCardView {...viewProps} />}
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
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
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
