import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Calendar, Clock, User, UserMinus, CheckCheck, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckoutConfirmationDialog } from "./confirmation-dialog";
import type { Guest, PaginatedResponse } from "@shared/schema";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getGuestBalance, isGuestPaid } from "@/lib/guest";

export default function DailyNotifications() {
  const labels = useAccommodationLabels();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkoutGuest, setCheckoutGuest] = useState<Guest | null>(null);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  
  const { data: guestsResponse, isLoading } = useVisibilityQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
    // Uses smart config: realtime (10s stale, 30s refetch)
  });
  
  const guests = guestsResponse?.data || [];

  // Don't show notifications if not authenticated
  if (!isAuthenticated) {
    return null;
  }

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

  const bulkCheckoutOverdueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/guests/checkout-overdue", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      toast({ title: "Success", description: "All overdue guests checked out." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to bulk checkout overdue guests", variant: "destructive" });
    },
  });

  const bulkCheckoutTodayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/guests/checkout-today", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/available"] });
      toast({ title: "Success", description: "All guests expected to check out today have been checked out." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to bulk checkout guests expected to check out today", variant: "destructive" });
    },
  });

  const handleCheckout = (guest: Guest) => {
    setCheckoutGuest(guest);
    setShowCheckoutConfirmation(true);
  };

  const confirmCheckout = () => {
    if (checkoutGuest) {
      checkoutMutation.mutate(checkoutGuest.id);
      setShowCheckoutConfirmation(false);
      setCheckoutGuest(null);
    }
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

  const currentHour = new Date().getHours();
  const isNoonTime = currentHour === 12; // 12 PM

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  // Don't show if no notifications
  if (checkingOutToday.length === 0 && overdueCheckouts.length === 0) {
    return null;
  }

  return (

    <Card className="mb-6 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white overflow-hidden shadow-sm">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-100/50 to-orange-50/30 border-b border-orange-200">
        <CardTitle className="text-xl font-semibold text-orange-800 flex items-center">
          <Bell className="mr-3 h-6 w-6" />

          Daily Checkout Notifications
          {isNoonTime && (
            <Badge className="ml-3 bg-orange-600 text-white">
              <Clock className="mr-1 h-3 w-3" />
              12:00 PM Alert
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Today's Expected Checkouts */}
        {checkingOutToday.length > 0 && (
          <div className="rounded-lg border border-orange-200 bg-orange-50/30 shadow-sm">
            <div className="px-5 py-4 flex items-center justify-between bg-orange-100/50 border-b border-orange-200 rounded-t-lg">
              <h4 className="font-semibold text-orange-800 flex items-center text-base">
                <Calendar className="mr-3 h-5 w-5" />
                Expected Checkouts Today ({checkingOutToday.length})
              </h4>
              <Button
                size="sm"
                onClick={() => bulkCheckoutTodayMutation.mutate()}
                disabled={bulkCheckoutTodayMutation.isPending || checkingOutToday.length === 0}
                className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {bulkCheckoutTodayMutation.isPending ? "Checking Out..." : "Check Out All"}
              </Button>
            </div>

              <Accordion type="multiple">
                {checkingOutToday.map((guest) => (
                  <AccordionItem key={guest.id} value={guest.id}>
                    <AccordionTrigger className="px-3 py-2">
                      <div className="flex w-full items-center gap-3 text-left">
                        <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{guest.name}</div>
                          <div className="text-xs text-gray-600 truncate">{labels.singular} {guest.capsuleNumber}</div>
                        </div>
                        <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 shrink-0">Due Today</Badge>
                        <ChevronRight className="ml-1 h-4 w-4 text-gray-400 shrink-0" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="flex flex-col gap-2 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Expected Checkout</span>
                          <span className="font-medium">Today</span>
                        </div>
                        {guest.phoneNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Phone</span>
                            <span className="font-medium">{guest.phoneNumber}</span>
                          </div>
                        )}
                        {guest.paymentAmount && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Payment</span>
                            <span className={`font-medium ${isGuestPaid(guest) ? '' : 'text-red-600'}`}>
                              RM {guest.paymentAmount}
                              {!isGuestPaid(guest) && getGuestBalance(guest) > 0 && (
                                <span className="text-red-600 text-xs font-medium ml-1">
                                  (Balance: RM{getGuestBalance(guest)})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {guest.notes && (
                          <div className="pt-1">
                            <div className="text-gray-600 mb-1">Notes</div>
                            <div className="text-gray-800">{guest.notes}</div>
                          </div>
                        )}
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleCheckout(guest)}
                            disabled={checkoutMutation.isPending}
                            isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            {checkoutMutation.isPending && checkoutMutation.variables === guest.id ? "Checking out..." : "Check Out"}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}


        {/* Overdue Checkouts */}
        {overdueCheckouts.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/30 shadow-sm">
            <div className="px-5 py-4 flex items-center justify-between bg-red-100/50 border-b border-red-200 rounded-t-lg">
              <h4 className="font-semibold text-red-800 flex items-center text-base">
                <Bell className="mr-3 h-5 w-5" />
                <span>Overdue Checkouts ({overdueCheckouts.length})</span>
              </h4>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => bulkCheckoutOverdueMutation.mutate()}
                disabled={bulkCheckoutOverdueMutation.isPending || overdueCheckouts.length === 0}
                className="shadow-sm"
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                {bulkCheckoutOverdueMutation.isPending ? "Checking Out..." : "Check Out All"}
              </Button>
            </div>

              <Accordion type="multiple">
                {overdueCheckouts.map((guest) => (
                  <AccordionItem key={guest.id} value={guest.id}>
                    <AccordionTrigger className="px-3 py-2">
                      <div className="flex w-full items-center gap-3 text-left">
                        <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{guest.name}</div>
                          <div className="text-xs text-gray-600 truncate">{labels.singular} {guest.capsuleNumber}</div>
                        </div>
                        <Badge className="bg-red-600 text-white shrink-0">Overdue</Badge>
                        <ChevronRight className="ml-1 h-4 w-4 text-gray-400 shrink-0" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="flex flex-col gap-2 text-sm text-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Expected Checkout</span>
                          <span className="font-medium">{guest.expectedCheckoutDate ? new Date(guest.expectedCheckoutDate).toLocaleDateString() : "—"}</span>
                        </div>
                        {guest.phoneNumber && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Phone</span>
                            <span className="font-medium">{guest.phoneNumber}</span>
                          </div>
                        )}
                        {guest.paymentAmount && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Payment</span>
                            <span className={`font-medium ${isGuestPaid(guest) ? '' : 'text-red-600'}`}>
                              RM {guest.paymentAmount}
                              {!isGuestPaid(guest) && getGuestBalance(guest) > 0 && (
                                <span className="text-red-600 text-xs font-medium ml-1">
                                  (Balance: RM{getGuestBalance(guest)})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        {guest.notes && (
                          <div className="pt-1">
                            <div className="text-gray-600 mb-1">Notes</div>
                            <div className="text-gray-800">{guest.notes}</div>
                          </div>
                        )}
                        <div className="pt-2 flex justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleCheckout(guest)}
                            disabled={checkoutMutation.isPending}
                            isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                            variant="destructive"
                          >
                            <UserMinus className="h-4 w-4 mr-1" />
                            {checkoutMutation.isPending && checkoutMutation.variables === guest.id ? "Checking out..." : "Check Out"}
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

        {isNoonTime && (
          <div className="text-center py-3 px-4 bg-orange-100/50 border border-orange-200 rounded-lg">
            <div className="text-sm text-orange-800 font-medium flex items-center justify-center">
              <Clock className="mr-2 h-4 w-4" />
              ⏰ Daily 12:00 PM checkout reminder - Please follow up with guests
            </div>
          </div>
        )}
      </CardContent>
      
      {checkoutGuest && (
        <CheckoutConfirmationDialog
          open={showCheckoutConfirmation}
          onOpenChange={(open) => {
            setShowCheckoutConfirmation(open);
            if (!open) {
              setCheckoutGuest(null);
            }
          }}
          onConfirm={confirmCheckout}
          guestName={checkoutGuest.name}
          capsuleNumber={checkoutGuest.capsuleNumber}
          isLoading={checkoutMutation.isPending}
        />
      )}
    </Card>
  );
}