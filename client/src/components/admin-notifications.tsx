import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellRing, Check, CheckCircle2, User, MapPin, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import type { AdminNotification, PaginatedResponse } from "@shared/schema";

export default function AdminNotifications() {
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Always call all hooks before any conditional logic
  const { data: allNotificationsResponse } = useVisibilityQuery<PaginatedResponse<AdminNotification>>({
    queryKey: ["/api/admin/notifications"],
    enabled: isAuthenticated, // Only fetch when authenticated
    // Uses smart config: frequent (1m stale, no auto-refetch)
  });
  
  const { data: unreadNotificationsResponse } = useVisibilityQuery<PaginatedResponse<AdminNotification>>({
    queryKey: ["/api/admin/notifications/unread"],
    enabled: isAuthenticated, // Only fetch when authenticated
    // Uses smart config: nearRealtime (30s stale, 60s refetch)
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/notifications/${notificationId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/unread"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/admin/notifications/read-all", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications/unread"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Now handle conditional logic after all hooks are called
  const allNotifications = allNotificationsResponse?.data || [];
  const unreadNotifications = unreadNotificationsResponse?.data || [];
  const notificationsToShow = showAll ? allNotifications : unreadNotifications;

  // Don't show notifications if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // If no unread notifications and not showing all, don't display
  if (unreadNotifications.length === 0 && !showAll) {
    return null;
  }

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = new Date(date);
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', date);
      return 'Invalid date';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'self_checkin':
        return <User className="h-4 w-4 text-green-600" />;
      case 'checkout':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      case 'maintenance':
        return <MapPin className="h-4 w-4 text-orange-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'self_checkin':
        return 'bg-green-50 border-green-200';
      case 'checkout':
        return 'bg-blue-50 border-blue-200';
      case 'maintenance':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Admin Notifications
            {unreadNotifications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadNotifications.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show Unread" : "Show All"}
            </Button>
            {unreadNotifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notificationsToShow.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>{showAll ? "No notifications" : "No unread notifications"}</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {notificationsToShow.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${getNotificationColor(notification.type)} ${
                    !notification.isRead ? 'shadow-sm' : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{notification.title}</h4>
                          {!notification.isRead && (
                            <Badge variant="secondary" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(notification.createdAt)}
                          </div>
                          {notification.capsuleNumber && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {notification.capsuleNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="ml-2"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}