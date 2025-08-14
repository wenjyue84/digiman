import { CreditCard, Banknote, DollarSign, Globe } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import qrCodeImage from "@assets/WhatsApp Image 2025-08-08 at 19.49.44_5bbbcb18_1754653834112.jpg";

interface PaymentInformationSectionProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
  watchedPaymentMethod: string;
}

export function PaymentInformationSection({ 
  form, 
  errors, 
  t, 
  watchedPaymentMethod 
}: PaymentInformationSectionProps) {
  return (
    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <CreditCard className="mr-2 h-4 w-4" />
        Payment Information
      </h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="paymentMethod" className="text-sm font-medium text-hostel-text">
            Payment Method
          </Label>
          <Select
            value={form.watch("paymentMethod") || ""}
            onValueChange={(value) => form.setValue("paymentMethod", value as "cash" | "bank" | "online_platform")}
          >
            <SelectTrigger className="w-full mt-1">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  <span>Cash (Paid to Guest/Person)</span>
                </div>
              </SelectItem>
              <SelectItem value="bank">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Bank Transfer</span>
                </div>
              </SelectItem>
              <SelectItem value="online_platform">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>Online Platform (Booking.com, Agoda, etc.)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">{t.paymentMethodHint}</p>
          {form.formState.errors.paymentMethod && (
            <p className="text-red-500 text-sm mt-1">{form.formState.errors.paymentMethod.message}</p>
          )}
        </div>

        {/* Cash Payment Description */}
        {watchedPaymentMethod === "cash" && (
          <div>
            <Label htmlFor="guestPaymentDescription" className="text-sm font-medium text-hostel-text">
              Describe whom you gave the payment to
            </Label>
            <Textarea
              id="guestPaymentDescription"
              placeholder="e.g., Paid RM50 to Ahmad at the front desk"
              className="w-full mt-1"
              {...form.register("guestPaymentDescription")}
            />
            <p className="text-xs text-gray-500 mt-1">{t.cashDescriptionHint}</p>
            {form.formState.errors.guestPaymentDescription && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.guestPaymentDescription.message}</p>
            )}
          </div>
        )}

        {/* Bank Transfer Details */}
        {watchedPaymentMethod === "bank" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-3">Bank Account Details</h4>
            <div className="space-y-2 text-sm">
              <div><strong>Account Name:</strong> Pelangi Capsule Hostel</div>
              <div><strong>Account Number:</strong> 551128652007</div>
              <div><strong>Bank:</strong> Maybank</div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-blue-700 mb-2">QR Code for Payment</p>
              <img 
                src={qrCodeImage} 
                alt="Payment QR Code" 
                className="w-32 h-auto mx-auto border border-gray-200 rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}