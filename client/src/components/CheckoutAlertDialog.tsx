import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import type { Guest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Bell, BellOff, Calendar, MessageSquare, Smartphone } from "lucide-react";
import { extractDetailedError, createErrorToast } from "@/lib/errorHandler";
import { format } from "date-fns";

interface CheckoutAlertDialogProps {
  guest: Guest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AlertSettings {
  enabled: boolean;
  channels: ('whatsapp' | 'push')[];
  advanceNotice: number[];
  lastNotified?: string;
}

function parseAlertSettings(json: string | null | undefined): AlertSettings {
  if (!json) {
    return {
      enabled: false,
      channels: ['whatsapp'],
      advanceNotice: [0],
    };
  }
  try {
    return JSON.parse(json);
  } catch {
    return {
      enabled: false,
      channels: ['whatsapp'],
      advanceNotice: [0],
    };
  }
}

export default function CheckoutAlertDialog({ guest, open, onOpenChange }: CheckoutAlertDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(false);
  const [notifyDayBefore, setNotifyDayBefore] = useState(false);
  const [notifyOnDay, setNotifyOnDay] = useState(true);
  const [useWhatsApp, setUseWhatsApp] = useState(true);
  const [usePush, setUsePush] = useState(false);

  // Reset form when dialog opens with new guest
  useEffect(() => {
    if (!guest || !open) return;

    const settings = parseAlertSettings(guest.alertSettings);
    setEnabled(settings.enabled);
    setNotifyDayBefore(settings.advanceNotice.includes(1));
    setNotifyOnDay(settings.advanceNotice.includes(0));
    setUseWhatsApp(settings.channels.includes('whatsapp'));
    setUsePush(settings.channels.includes('push'));
  }, [guest, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!guest) {
        throw new Error("No guest selected");
      }

      // Build advanceNotice array
      const advanceNotice: number[] = [];
      if (notifyDayBefore) advanceNotice.push(1);
      if (notifyOnDay) advanceNotice.push(0);

      // Build channels array
      const channels: ('whatsapp' | 'push')[] = [];
      if (useWhatsApp) channels.push('whatsapp');
      if (usePush) channels.push('push');

      const alertSettings: AlertSettings = {
        enabled,
        channels,
        advanceNotice,
      };

      const updates = {
        alertSettings: JSON.stringify(alertSettings),
      };

      console.log('Saving checkout alert settings:', {
        guestId: guest.id,
        settings: alertSettings,
      });

      return await apiRequest("PATCH", `/api/guests/${guest.id}`, updates);
    },
    onSuccess: () => {
      toast({
        title: "Alert Settings Saved",
        description: enabled
          ? "Checkout reminders are now enabled for this guest"
          : "Checkout reminders are now disabled for this guest",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Failed to save alert settings:", error);
      const errorDetails = extractDetailedError(error);
      toast(createErrorToast("Failed to save alert settings", errorDetails));
    },
  });

  const handleSave = () => {
    // Validation
    if (enabled) {
      if (!notifyDayBefore && !notifyOnDay) {
        toast({
          title: "Validation Error",
          description: "Please select at least one notification timing",
          variant: "destructive",
        });
        return;
      }
      if (!useWhatsApp && !usePush) {
        toast({
          title: "Validation Error",
          description: "Please select at least one notification channel",
          variant: "destructive",
        });
        return;
      }
    }

    mutation.mutate();
  };

  if (!guest) return null;

  const checkoutDateFormatted = guest.expectedCheckoutDate
    ? format(new Date(guest.expectedCheckoutDate), "PPP")
    : "Not set";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Checkout Reminder Settings
          </DialogTitle>
          <DialogDescription>
            Configure automatic checkout notifications for {guest.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Expected Checkout Date Display */}
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Expected Checkout Date</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {checkoutDateFormatted}
                </p>
              </div>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="enable-alerts" className="flex flex-col space-y-1">
              <span className="text-base font-medium">Enable Checkout Reminder</span>
              <span className="text-sm text-muted-foreground font-normal">
                Receive notifications when checkout date approaches
              </span>
            </Label>
            <Switch
              id="enable-alerts"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              {/* Timing Options */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">When to notify</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify-day-before"
                      checked={notifyDayBefore}
                      onCheckedChange={(checked) => setNotifyDayBefore(checked as boolean)}
                    />
                    <label
                      htmlFor="notify-day-before"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Notify 1 day before checkout
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notify-on-day"
                      checked={notifyOnDay}
                      onCheckedChange={(checked) => setNotifyOnDay(checked as boolean)}
                    />
                    <label
                      htmlFor="notify-on-day"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Notify on checkout day (9:00 AM)
                    </label>
                  </div>
                </div>
              </div>

              {/* Channel Options */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">Notification channels</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="channel-whatsapp"
                      checked={useWhatsApp}
                      onCheckedChange={(checked) => setUseWhatsApp(checked as boolean)}
                    />
                    <label
                      htmlFor="channel-whatsapp"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp (+60127088789)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="channel-push"
                      checked={usePush}
                      onCheckedChange={(checked) => setUsePush(checked as boolean)}
                    />
                    <label
                      htmlFor="channel-push"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Smartphone className="h-4 w-4" />
                      Push Notification (admin app)
                    </label>
                  </div>
                </div>
              </div>

              {/* Info Note */}
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Notifications are sent at 9:00 AM Malaysia Time</li>
                  <li>You'll be reminded to check out the guest on the selected days</li>
                  <li>Payment status will be included in the notification</li>
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
