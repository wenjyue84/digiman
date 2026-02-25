import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiRequest } from "@/lib/queryClient";
import type { Guest, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getDefaultCollector } from "@/components/check-in/utils";
import { getGuestBalance } from "@/lib/guest";
import { Calendar, CalendarCheck, CalendarPlus, CheckCircle, CreditCard, DollarSign, User as UserIcon, Wallet } from "lucide-react";
import { extractDetailedError, createErrorToast } from "@/lib/errorHandler";
import { format } from "date-fns";

interface ExtendStayDialogProps {
  guest: Guest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExtendStayDialog({ guest, open, onOpenChange }: ExtendStayDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [days, setDays] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [paidNow, setPaidNow] = useState<string>("");
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [collector, setCollector] = useState<string>("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const collectorOptions = useMemo(
    () => users.map((u) => getDefaultCollector(u)),
    [users]
  );

  const presetOptions = useMemo(() => ([
    { label: "1 day", value: 1 },
    { label: "1 week", value: 7 },
    { label: "2 weeks", value: 14 },
    { label: "1 month", value: 30 },
  ]), []);

  const computedNewCheckout = useMemo(() => {
    if (!guest) return "";
    const base = guest.expectedCheckoutDate ? new Date(guest.expectedCheckoutDate) : new Date();
    const d = new Date(base);
    d.setDate(d.getDate() + (Number.isFinite(days) ? days : 0));
    return d.toISOString().slice(0, 10);
  }, [guest, days]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!guest) {
        throw new Error("No guest selected for extension");
      }

      try {
        const existingPaid = parseFloat(guest.paymentAmount || "0") || 0;
        const priceNum = parseFloat(price || "0") || 0;
        const paidNowNum = parseFloat(paidNow || "0") || 0;
        const existingOutstanding = getGuestBalance(guest) || 0;
        const newOutstanding = Math.max(existingOutstanding + priceNum - paidNowNum, 0);

        // Merge notes: strip old outstanding marker if present
        const baseNotes = (guest.notes || "").replace(/Outstanding balance: RM\d+(\.\d{1,2})?/i, "").trim();
        const mergedNotes = newOutstanding > 0
          ? (baseNotes ? `${baseNotes}. ` : "") + `Outstanding balance: RM${newOutstanding.toFixed(2)}`
          : baseNotes || ""; // Ensure it's always a string, never null

        const updates: Partial<Guest> = {
          id: guest.id, // Include the guest ID
          expectedCheckoutDate: computedNewCheckout,
          // Increase cumulative paid amount when recording a new payment
          ...(paidNow !== "" ? { paymentAmount: (existingPaid + paidNowNum).toFixed(2) } : {}),
          // Auto-set paid flag based on computed outstanding unless user overrides later
          isPaid: newOutstanding === 0,
          paymentMethod: paymentMethod as any,
          ...(collector ? { paymentCollector: collector } : {}),
          notes: mergedNotes, // Always set notes to a string
        };

        console.log('Sending PATCH request to extend stay:', {
          endpoint: `/api/guests/${guest.id}`,
          updates,
          guestId: guest.id
        });

        const res = await apiRequest("PATCH", `/api/guests/${guest.id}`, updates);
        
        if (!res.ok) {
          let errorText = await res.text();
          let errorDetails = "";
          
          try {
            // Try to parse as JSON for better error details
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorText = errorJson.message;
            }
            if (errorJson.details && Array.isArray(errorJson.details)) {
              errorDetails = errorJson.details.map((detail: any) => 
                `• ${detail.field}: ${detail.message}`
              ).join('\n');
            }
          } catch {
            // If not JSON, use the raw text
          }
          
          console.error('Server responded with error:', {
            status: res.status,
            statusText: res.statusText,
            response: errorText,
            details: errorDetails
          });
          
          // Create a more informative error message
          let errorMessage = `HTTP ${res.status}: ${errorText}`;
          if (errorDetails) {
            errorMessage += `\n\nValidation Errors:\n${errorDetails}`;
          }
          
          throw new Error(errorMessage);
        }

        return res.json();
      } catch (error) {
        console.error('Error in extend stay mutation:', error);
        
        // Re-throw with more context
        if (error instanceof Error) {
          throw new Error(`Extend stay failed: ${error.message}`);
        } else {
          throw new Error(`Extend stay failed: ${String(error)}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guests/checked-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/occupancy"] });
      toast({ title: "Extended", description: "Stay extended successfully" });
      onOpenChange(false);
      // reset
      setDays(1);
      setPrice("");
      setPaidNow("");
      setIsPaid(false);
      setPaymentMethod("cash");
      setCollector("");
    },
    onError: (error) => {
      const detailedError = extractDetailedError(error);
      const errorToast = createErrorToast(detailedError);
      
      // Show the main error toast
      toast({
        title: errorToast.title,
        description: errorToast.description,
        variant: errorToast.variant
      });
      
      // Log detailed debug info to console for developers
      if (errorToast.debugDetails) {
        console.error('Extend Stay Error Details:', errorToast.debugDetails);
        console.error('Full Error Object:', error);
      }
    }
  });

  const submit = () => {
    if (!guest) {
      toast({ 
        title: "Error", 
        description: "No guest selected for extension", 
        variant: "destructive" 
      });
      return;
    }

    // Validate guest object has required fields
    if (!guest.id) {
      toast({ 
        title: "Error", 
        description: "Guest ID is missing. Please refresh the page and try again.", 
        variant: "destructive" 
      });
      return;
    }

    // Validate required fields
    if (!price || parseFloat(price) <= 0) {
      toast({ 
        title: "Validation Error", 
        description: "Please enter a valid amount for new charges (must be greater than RM 0.00)", 
        variant: "destructive" 
      });
      return;
    }

    if (days === 0 || !Number.isFinite(days)) {
      toast({ 
        title: "Validation Error", 
        description: "Please select a valid duration (cannot be 0 days)", 
        variant: "destructive" 
      });
      return;
    }

    if (!computedNewCheckout) {
      toast({ 
        title: "Validation Error", 
        description: "Unable to calculate new checkout date. Please check the duration and current checkout date.", 
        variant: "destructive" 
      });
      return;
    }

    // Log the data being sent for debugging
    console.log('Extending stay with data:', {
      guestId: guest.id,
      guestName: guest.name,
      unitNumber: guest.unitNumber,
      currentCheckout: guest.expectedCheckoutDate,
      newCheckout: computedNewCheckout,
      days,
      price,
      paidNow,
      paymentMethod,
      collector,
      guestObject: guest // Log the full guest object for debugging
    });

    mutation.mutate();
  };

  // Auto-sync paidNow with price when price changes
  useEffect(() => {
    if (price) {
      setPaidNow(price);
    }
  }, [price]);

  useEffect(() => {
    if (open) {
      setCollector(getDefaultCollector(user));
      setPaidNow(""); // Reset to allow auto-sync
    }
  }, [open, user]);

  useEffect(() => {
    if (open && days === 1 && price === "") {
      setPrice("45");
    }
  }, [open, days, price]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-blue-600" />
            Extend Stay
          </DialogTitle>
          <DialogDescription>
            {guest ? `Extend ${guest.name}'s stay in ${guest.unitNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
            {/* Duration Section - Redesigned */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Duration
              </Label>
              
              {/* Preset Duration Buttons */}
              <div className="flex flex-wrap gap-2">
                {presetOptions.map(opt => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={days === opt.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDays(opt.value)}
                    className="min-w-[80px]"
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              
              {/* Custom Duration Input */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label htmlFor="custom-days" className="text-sm text-gray-600 min-w-[60px]">
                    Custom:
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!guest?.expectedCheckoutDate) return;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const expectedDate = new Date(guest.expectedCheckoutDate);
                      expectedDate.setHours(0, 0, 0, 0);
                      const diffDays = Math.round((today.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
                      setDays(diffDays);
                    }}
                    className="h-8"
                    data-testid="button-today"
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!guest?.expectedCheckoutDate) return;
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      tomorrow.setHours(0, 0, 0, 0);
                      const expectedDate = new Date(guest.expectedCheckoutDate);
                      expectedDate.setHours(0, 0, 0, 0);
                      const diffDays = Math.round((tomorrow.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
                      setDays(diffDays);
                    }}
                    className="h-8"
                    data-testid="button-tomorrow"
                  >
                    Tomorrow
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="custom-days"
                    type="number"
                    min={-365}
                    max={365}
                    value={days}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        setDays(0);
                      } else {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          setDays(Math.max(-365, Math.min(365, numValue)));
                        }
                      }
                    }}
                    onFocus={(e) => {
                      e.target.select();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                    className={`w-24 ${days < 0 ? 'border-red-300 text-red-900 bg-red-50' : ''}`}
                    placeholder="Days"
                  />
                  <span className={`text-sm ${days < 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>days</span>
                </div>
              </div>
            </div>

            {/* New Checkout Date Picker */}
            <div className={`${days < 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
              <Label className={`flex items-center gap-1 ${days < 0 ? 'text-red-800' : 'text-blue-800'}`}>
                <CalendarCheck className="h-4 w-4" /> New checkout date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={`w-full mt-2 justify-start text-left font-normal ${
                      days < 0 
                        ? 'border-red-300 bg-red-50 text-red-900 hover:bg-red-100' 
                        : 'bg-white'
                    }`}
                  >
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    {computedNewCheckout ? format(new Date(computedNewCheckout), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={computedNewCheckout ? new Date(computedNewCheckout) : undefined}
                    onSelect={(date) => {
                      if (!date || !guest?.expectedCheckoutDate) return;
                      
                      // Calculate days difference
                      const selectedDate = new Date(date);
                      selectedDate.setHours(0, 0, 0, 0);
                      const expectedDate = new Date(guest.expectedCheckoutDate);
                      expectedDate.setHours(0, 0, 0, 0);
                      
                      const diffDays = Math.round((selectedDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
                      setDays(diffDays);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {days < 0 && (
                <div className="mt-2 text-sm text-red-700 font-medium">
                  ⚠️ Shortening stay by {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> New charges (RM)
                </Label>
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 45.00"
                  inputMode="decimal"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1">
                  <Wallet className="h-4 w-4" /> Paid now (RM)
                </Label>
                <Input
                  value={paidNow}
                  onChange={(e) => setPaidNow(e.target.value)}
                  placeholder="e.g. 45.00"
                  inputMode="decimal"
                  className="mt-1"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {paidNow === price ? "✓ Auto-synced with charges" : "Can be overridden"}
                </div>
              </div>
            </div>

          {guest && (
            <div className="rounded-md border p-3 bg-gray-50 text-sm">
              {(() => {
                const existing = getGuestBalance(guest) || 0;
                const priceNum = parseFloat(price || "0") || 0;
                const paidNum = parseFloat(paidNow || "0") || 0;
                const nextOutstanding = Math.max(existing + priceNum - paidNum, 0);
                const willBePaid = nextOutstanding === 0;
                return (
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600">Existing balance</span><span className="font-medium">RM {existing.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">New charges</span><span className="font-medium">RM {priceNum.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Paid now</span><span className="font-medium">RM {paidNum.toFixed(2)}</span></div>
                    <div className="flex justify-between pt-1 border-t"><span className="text-gray-800">New outstanding</span><span className={`font-semibold ${nextOutstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>RM {nextOutstanding.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-600">Status: {willBePaid ? <span className="text-green-700 font-medium">Will mark as Paid</span> : <span className="text-red-600 font-medium">Will remain Outstanding</span>}</div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox id="paid" checked={isPaid} onCheckedChange={(v) => setIsPaid(Boolean(v))} />
            <Label htmlFor="paid" className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" /> Payment done
            </Label>
            <span className="text-xs text-gray-500">(Will auto-enable when outstanding is RM 0.00)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1">
                <CreditCard className="h-4 w-4" /> Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="tng">TNG</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="platform">Platform</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <UserIcon className="h-4 w-4" /> Paid to (collector)
              </Label>
              <Select
                value={collectorOptions.includes(collector) ? collector : "custom"}
                onValueChange={(v) => {
                  if (v === "custom") {
                    setCollector("");
                  } else {
                    setCollector(v);
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select collector" />
                </SelectTrigger>
                <SelectContent>
                  {collectorOptions.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom collector...</SelectItem>
                </SelectContent>
              </Select>
              {!collectorOptions.includes(collector) && (
                <Input
                  value={collector}
                  onChange={(e) => setCollector(e.target.value)}
                  placeholder="Enter collector name"
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={submit} isLoading={mutation.isPending}>Confirm</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


