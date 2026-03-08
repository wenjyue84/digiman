import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import type { Reservation } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESERVATION_SOURCES, DEPOSIT_METHODS } from "./reservation-constants";
import { Plus, CheckCircle, AlertCircle } from "lucide-react";

const formSchema = z.object({
  guestName: z.string().min(1, "Required"),
  guestPhone: z.string().optional(),
  guestEmail: z.string().email("Invalid email").or(z.literal("")).optional(),
  guestNationality: z.string().optional(),
  numberOfGuests: z.coerce.number().int().min(1).default(1),
  unitNumber: z.string().optional(),
  checkInDate: z.string().min(1, "Required"),
  checkOutDate: z.string().min(1, "Required"),
  numberOfNights: z.coerce.number().int().min(1).default(1),
  totalAmount: z.string().optional(),
  depositAmount: z.string().optional(),
  depositMethod: z.string().optional(),
  depositPaid: z.boolean().default(false),
  source: z.string().default("walk_in"),
  status: z.string().default("confirmed"),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingReservation: Reservation | null;
  onSubmit: (data: FormData, isEdit: boolean) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ReservationForm({ open, onOpenChange, editingReservation, onSubmit, onCancel, isSubmitting }: Props) {
  const isEdit = !!editingReservation;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestName: "",
      numberOfGuests: 1,
      numberOfNights: 1,
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: "",
      source: "walk_in",
      status: "confirmed",
      depositPaid: false,
    },
  });

  const watchUnit = form.watch("unitNumber");
  const watchCheckIn = form.watch("checkInDate");
  const watchCheckOut = form.watch("checkOutDate");

  // Auto-calculate nights
  useEffect(() => {
    if (watchCheckIn && watchCheckOut) {
      const diff = Math.ceil((new Date(watchCheckOut).getTime() - new Date(watchCheckIn).getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 0) form.setValue("numberOfNights", diff);
    }
  }, [watchCheckIn, watchCheckOut, form]);

  // Availability check
  const { data: availability } = useQuery<{ available: boolean; conflicts: any[] }>({
    queryKey: ["/api/reservations/availability", watchUnit, watchCheckIn, watchCheckOut],
    queryFn: async () => {
      if (!watchUnit || !watchCheckIn || !watchCheckOut) return { available: true, conflicts: [] };
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/reservations/availability?unitNumber=${watchUnit}&checkIn=${watchCheckIn}&checkOut=${watchCheckOut}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return { available: true, conflicts: [] };
      return res.json();
    },
    enabled: !!watchUnit && !!watchCheckIn && !!watchCheckOut,
  });

  // Reset form when editing
  useEffect(() => {
    if (editingReservation) {
      form.reset({
        guestName: editingReservation.guestName,
        guestPhone: editingReservation.guestPhone || "",
        guestEmail: editingReservation.guestEmail || "",
        guestNationality: editingReservation.guestNationality || "",
        numberOfGuests: editingReservation.numberOfGuests,
        unitNumber: editingReservation.unitNumber || "",
        checkInDate: editingReservation.checkInDate,
        checkOutDate: editingReservation.checkOutDate,
        numberOfNights: editingReservation.numberOfNights,
        totalAmount: editingReservation.totalAmount || "",
        depositAmount: editingReservation.depositAmount || "",
        depositMethod: editingReservation.depositMethod || "",
        depositPaid: editingReservation.depositPaid,
        source: editingReservation.source,
        status: editingReservation.status,
        specialRequests: editingReservation.specialRequests || "",
        internalNotes: editingReservation.internalNotes || "",
      });
    } else {
      form.reset({
        guestName: "",
        numberOfGuests: 1,
        numberOfNights: 1,
        checkInDate: new Date().toISOString().split('T')[0],
        checkOutDate: "",
        source: "walk_in",
        status: "confirmed",
        depositPaid: false,
      });
    }
  }, [editingReservation, form]);

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data, isEdit);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Reservation" : "New Reservation"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Guest Name *</Label>
              <Input {...form.register("guestName")} placeholder="Full name" />
              {form.formState.errors.guestName && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.guestName.message}</p>
              )}
            </div>
            <div>
              <Label>Phone</Label>
              <Input {...form.register("guestPhone")} placeholder="+60 12-345 6789" />
            </div>
            <div>
              <Label>Email</Label>
              <Input {...form.register("guestEmail")} type="email" placeholder="guest@email.com" />
            </div>
            <div>
              <Label>Nationality</Label>
              <Input {...form.register("guestNationality")} placeholder="Malaysian" />
            </div>
          </div>

          {/* Stay Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>Check-in *</Label>
              <Input {...form.register("checkInDate")} type="date" />
            </div>
            <div>
              <Label>Check-out *</Label>
              <Input {...form.register("checkOutDate")} type="date" />
            </div>
            <div>
              <Label>Nights</Label>
              <Input {...form.register("numberOfNights")} type="number" min={1} />
            </div>
            <div>
              <Label>Guests</Label>
              <Input {...form.register("numberOfGuests")} type="number" min={1} />
            </div>
          </div>

          {/* Unit + Availability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Unit (blank = any available)</Label>
              <Input {...form.register("unitNumber")} placeholder="C1, C2, ..." />
              {availability && watchUnit && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${availability.available ? "text-green-600" : "text-red-600"}`}>
                  {availability.available
                    ? <><CheckCircle className="h-3 w-3" /> Available</>
                    : <><AlertCircle className="h-3 w-3" /> Conflicts found ({availability.conflicts?.length ?? 0})</>
                  }
                </div>
              )}
            </div>
            <div>
              <Label>Source</Label>
              <Select value={form.watch("source")} onValueChange={(v) => form.setValue("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESERVATION_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>Total (RM)</Label>
              <Input {...form.register("totalAmount")} placeholder="0.00" />
            </div>
            <div>
              <Label>Deposit (RM)</Label>
              <Input {...form.register("depositAmount")} placeholder="0.00" />
            </div>
            <div>
              <Label>Deposit Method</Label>
              <Select value={form.watch("depositMethod") || ""} onValueChange={(v) => form.setValue("depositMethod", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DEPOSIT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...form.register("depositPaid")} className="rounded" />
                <span className="text-sm">Deposit Paid</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Special Requests</Label>
              <Textarea {...form.register("specialRequests")} rows={2} placeholder="Guest requests..." />
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea {...form.register("internalNotes")} rows={2} placeholder="Staff notes..." />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Create Booking"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
