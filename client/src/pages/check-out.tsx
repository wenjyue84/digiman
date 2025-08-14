import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus, CheckCheck, ToggleLeft, ToggleRight, ChevronRight, User, Calendar, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

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

  // Auto-switch view mode based on device type
  useEffect(() => {
    setIsCondensedView(isMobile);
  }, [isMobile]);
  
  const { data: guestsResponse, isLoading } = useQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
  });
  
  const guests = guestsResponse?.data || [];

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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check out guest",
        variant: "destructive",
      });
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

              {/* Desktop Table View */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.singular}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      {!isCondensedView && (
                        <>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Checkout</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.map((guest) => {
                      const genderIcon = getGenderIcon(guest.gender || undefined);
                      const isGuestCheckingOut = checkoutMutation.isPending && checkoutMutation.variables === guest.id;
                      const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
                      const isToday = guest.expectedCheckoutDate === today;
                      
                      return (
                        <tr key={guest.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isToday ? 'bg-orange-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                              {guest.capsuleNumber}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(guest.checkinTime).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-hostel-text font-medium">{formatDuration(guest.checkinTime.toString())}</div>
                            <div className="text-xs text-gray-500">Since check-in</div>
                          </td>
                          {!isCondensedView && (
                            <>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
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
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {guest.paymentAmount ? (
                                  <div>
                                    <div className="font-medium">RM {guest.paymentAmount}</div>
                                    <div className="text-xs text-gray-500">{guest.paymentCollector || 'N/A'}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No payment</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 ${isGuestPaid(guest) ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                                  <span className="text-xs text-gray-600">{isGuestPaid(guest) ? 'Paid' : 'Unpaid'}</span>
                                </div>
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap">
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {guests.map((guest) => {
                  const genderIcon = getGenderIcon(guest.gender || undefined);
                  const isGuestCheckingOut = checkoutMutation.isPending && checkoutMutation.variables === guest.id;
                  const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
                  const isToday = guest.expectedCheckoutDate === today;
                  
                  return (
                    <Card key={guest.id} className={`p-3 hover-card-pop ${isOverdue ? 'bg-red-50 border-red-200' : isToday ? 'bg-orange-50 border-orange-200' : ''}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 ${genderIcon.bgColor} rounded-full flex items-center justify-center text-sm font-semibold ${genderIcon.textColor}`}>
                            {genderIcon.icon || getInitials(guest.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                                {guest.capsuleNumber}
                              </Badge>
                              <span className="font-medium">{guest.name}</span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              In: {new Date(guest.checkinTime).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </div>
                            {!isCondensedView && (
                              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                                <div>
                                  <span className="font-medium text-gray-800">Duration:</span> {formatDuration(guest.checkinTime.toString())}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-800">Nationality:</span> {guest.nationality || '—'}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-800">Phone:</span> {guest.phoneNumber || '—'}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-800">Payment:</span> {guest.paymentAmount ? `RM ${guest.paymentAmount}` : '—'}
                                </div>
                                {guest.expectedCheckoutDate && (
                                  <div className="col-span-2">
                                    <span className="font-medium text-gray-800">Expected Out:</span> 
                                    <span className={`ml-1 ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                                      {new Date(guest.expectedCheckoutDate).toLocaleDateString()}
                                      {isOverdue && <span className="text-red-500 ml-1">(Overdue)</span>}
                                      {isToday && <span className="text-orange-500 ml-1">(Today)</span>}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
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
                    </Card>
                  );
                })}
              </div>

              {/* Summary Information */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{guests.length}</div>
                    <div className="text-sm text-gray-600">Total Checked In</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{checkingOutToday.length}</div>
                    <div className="text-sm text-gray-600">Expected Today</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{overdueCheckouts.length}</div>
                    <div className="text-sm text-gray-600">Overdue</div>
                  </div>
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
