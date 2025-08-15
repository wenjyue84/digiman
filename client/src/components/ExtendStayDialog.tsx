import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import type { Guest, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getDefaultCollector } from "@/components/check-in/utils";
import { getGuestBalance } from "@/lib/guest";
import { Calendar, CalendarCheck, CalendarPlus, CheckCircle, CreditCard, DollarSign, User as UserIcon, Wallet } from "lucide-react";

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
      if (!guest) return;
      const existingPaid = parseFloat(guest.paymentAmount || "0") || 0;
      const priceNum = parseFloat(price || "0") || 0;
      const paidNowNum = parseFloat(paidNow || "0") || 0;
      const existingOutstanding = getGuestBalance(guest) || 0;
      const newOutstanding = Math.max(existingOutstanding + priceNum - paidNowNum, 0);

      // Merge notes: strip old outstanding marker if present
      const baseNotes = (guest.notes || "").replace(/Outstanding balance: RM\d+(\.\d{1,2})?/i, "").trim();
      const mergedNotes = newOutstanding > 0
        ? (baseNotes ? `${baseNotes}. ` : "") + `Outstanding balance: RM${newOutstanding.toFixed(2)}`
        : (baseNotes || null);

      const updates: Partial<Guest> = {
        expectedCheckoutDate: computedNewCheckout,
        // Increase cumulative paid amount when recording a new payment
        ...(paidNow !== "" ? { paymentAmount: (existingPaid + paidNowNum).toFixed(2) } : {}),
        // Auto-set paid flag based on computed outstanding unless user overrides later
        isPaid: newOutstanding === 0,
        paymentMethod: paymentMethod as any,
        ...(collector ? { paymentCollector: collector } : {}),
        ...(mergedNotes !== undefined ? { notes: mergedNotes as any } : {}),
      };
      const res = await apiRequest("PATCH", `/api/guests/${guest.id}`, updates);
      return res.json();
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
    onError: () => {
      toast({ title: "Error", description: "Failed to extend stay", variant: "destructive" });
    }
  });

  const submit = () => {
    if (!guest) return;
    mutation.mutate();
  };

  useEffect(() => {
    if (open) {
      setCollector(getDefaultCollector(user));
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
            {guest ? `Extend ${guest.name}'s stay in ${guest.capsuleNumber}` : ''}
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


