/**
 * Custom hook for bulk checkout mutation.
 * Handles bulk checkout-all API call, query invalidation, and push notifications.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { pushNotificationManager } from "@/lib/pushNotifications";

export function useBulkCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);

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

      // Show push notification for bulk check-out
      pushNotificationManager.showLocalNotification(
        "Bulk Check-Out Complete",
        {
          body: `${data.count || 'All'} guests have been checked out`,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `bulk-checkout-${Date.now()}`,
          requireInteraction: false,
          data: {
            type: "bulk-checkout",
            count: data.count,
          },
        }
      ).catch(error => {
        console.log("Could not show notification:", error);
      });

      toast({
        title: "Success",
        description: data.message || `Successfully checked out ${data.count} guests`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to bulk checkout guests",
        variant: "destructive",
      });
    },
  });

  const handleBulkCheckout = () => {
    setShowConfirmation(true);
  };

  const confirmBulkCheckout = () => {
    bulkCheckoutMutation.mutate();
    setShowConfirmation(false);
  };

  return {
    bulkCheckoutMutation,
    showConfirmation,
    setShowConfirmation,
    handleBulkCheckout,
    confirmBulkCheckout,
  };
}
