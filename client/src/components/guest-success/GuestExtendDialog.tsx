import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CalendarCheck, CalendarPlus, CreditCard, DollarSign, Wallet } from "lucide-react";

interface GuestExtendDialogProps {
  guest: {
    id: string;
    name: string;
    capsuleNumber: string;
    expectedCheckoutDate: string;
    paymentAmount?: string;
    notes?: string;
    isPaid?: boolean;
  } | null;
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function GuestExtendDialog({ 
  guest, 
  token, 
  open, 
  onOpenChange, 
  onSuccess 
}: GuestExtendDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [paidNow, setPaidNow] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

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

  // Calculate guest balance from notes
  const getGuestBalance = (guest: any) => {
    if (!guest?.notes) return 0;
    const match = guest.notes.match(/Outstanding balance: RM([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!guest) return;
      
      const response = await fetch(`/api/guest-extend/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days,
          price,
          paidNow,
          paymentMethod
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to extend stay');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "Extended", 
        description: `Stay extended successfully until ${data.newCheckoutDate}` 
      });
      onOpenChange(false);
      onSuccess(); // Refresh the success page data
      // Reset form
      setDays(1);
      setPrice("");
      setPaidNow("");
      setPaymentMethod("cash");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to extend stay", 
        variant: "destructive" 
      });
    }
  });

  const submit = () => {
    if (!guest) return;
    mutation.mutate();
  };

  // Set default price for 1 day
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
            {guest ? `Extend your stay in ${guest.capsuleNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 items-end">
            <div className="col-span-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Duration
              </Label>
              <div className="flex gap-2 mt-1">
                <Select onValueChange={(v) => setDays(parseInt(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presetOptions.map(opt => (
                      <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={Number.isFinite(days) ? String(days) : ''}
                  onChange={(e) => setDays(Math.max(1, parseInt(e.target.value || '1')))}
                  placeholder="Days"
                  className="w-24"
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <CalendarCheck className="h-4 w-4" /> New checkout
              </Label>
              <div className="mt-2 text-sm font-medium">{computedNewCheckout || '—'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Charges (RM)
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
                <Wallet className="h-4 w-4" /> Pay now (RM)
              </Label>
              <Input
                value={paidNow}
                onChange={(e) => setPaidNow(e.target.value)}
                placeholder="e.g. 45.00"
                inputMode="decimal"
                className="mt-1"
              />
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
                    <div className="flex justify-between"><span className="text-gray-600">Current balance</span><span className="font-medium">RM {existing.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Extension charges</span><span className="font-medium">RM {priceNum.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Pay now</span><span className="font-medium">RM {paidNum.toFixed(2)}</span></div>
                    <div className="flex justify-between pt-1 border-t"><span className="text-gray-800">New balance</span><span className={`font-semibold ${nextOutstanding > 0 ? 'text-red-600' : 'text-green-700'}`}>RM {nextOutstanding.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-600">Status: {willBePaid ? <span className="text-green-700 font-medium">Will be Paid</span> : <span className="text-red-600 font-medium">Outstanding</span>}</div>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <Label className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Payment Method
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="tng">TNG</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="platform">Booking Platform</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? "Extending..." : "Confirm Extension"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
