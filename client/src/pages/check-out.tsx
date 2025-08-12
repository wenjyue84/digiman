import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { Guest, PaginatedResponse } from "@shared/schema";

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

export default function CheckOut() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const labels = useAccommodationLabels();
  
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

  const handleCheckout = (guestId: string) => {
    checkoutMutation.mutate(guestId);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="text-center">
            <div className="w-16 h-16 bg-hostel-error bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserMinus className="text-hostel-error h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-hostel-text">Guest Check-Out</CardTitle>
            <p className="text-gray-600 mt-2">Select a guest to complete check-out process</p>
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
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{labels.singular}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guests.map((guest) => (
                      <tr key={guest.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                          <span className="text-white font-medium">{getInitials(guest.name)}</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-hostel-text">{guest.name}</div>
                          <div className="text-sm text-gray-500">ID: #{guest.id.slice(0, 8)}</div>
                        </div>
                      </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className="bg-blue-600 text-white">
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button 
                            onClick={() => handleCheckout(guest.id)}
                            disabled={checkoutMutation.isPending}
                            isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                            className="bg-hostel-error hover:bg-red-600 text-white font-medium"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Check Out
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600 text-center">
                  <i className="fas fa-info-circle mr-2"></i>
                  Check-out time will be automatically recorded when you complete the process
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
