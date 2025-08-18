import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { UserMinus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Guest } from "@shared/schema";

function formatDuration(checkinTime: string): string {
  const checkin = new Date(checkinTime);
  const now = new Date();
  const diff = now.getTime() - checkin.getTime();
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

function getInitials(name: string): string {
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
}

export default function GuestTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: guests = [], isLoading } = useQuery<Guest[]>({
    queryKey: ["/api/guests/checked-in"],
  });

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
      // Invalidate cleaning status queries to update the cleaning list
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/cleaning-status/to_be_cleaned"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules/cleaning-status/cleaned"] });
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

  const handleCheckout = (guestId: string) => {
    checkoutMutation.mutate(guestId);
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-hostel-text">Currently Checked In</CardTitle>
          <Badge variant="secondary" className="bg-hostel-secondary bg-opacity-10 text-hostel-secondary">
            <div className="w-2 h-2 bg-hostel-secondary rounded-full mr-1.5"></div>
            {guests.length} Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {guests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No guests currently checked in</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capsule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-hostel-primary bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                          <span className="text-hostel-primary font-medium text-sm">{getInitials(guest.name)}</span>
                        </div>
                        <span className="text-sm font-medium text-hostel-text">{guest.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
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
                      <Badge className="bg-green-600 text-white">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5"></div>
                        Checked In
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleCheckout(guest.id)}
                              disabled={checkoutMutation.isPending}
                              className="text-hostel-error hover:text-red-700 font-medium"
                            >
                              <UserMinus className="mr-1 h-4 w-4" />
                              Check Out
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Check out {guest.name} and free their capsule</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}