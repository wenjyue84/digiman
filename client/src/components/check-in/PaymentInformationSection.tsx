import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InsertGuest } from "@shared/schema";
// REFACTORING: Import configuration utilities to eliminate hardcoded values
import { useFormFieldConfig, useBusinessRules } from "@/lib/configUtils";

interface PaymentInformationSectionProps {
  form: UseFormReturn<InsertGuest>;
  defaultCollector: string;
}

export default function PaymentInformationSection({ form, defaultCollector }: PaymentInformationSectionProps) {
  // REFACTORED: Use configuration utilities instead of hardcoded values
  const { getPaymentMethods, getPaymentPresets, getFieldLimits } = useFormFieldConfig();
  const { getPaymentRules } = useBusinessRules();

  const paymentMethods = getPaymentMethods();
  const paymentPresets = getPaymentPresets();
  const fieldLimits = getFieldLimits();
  const paymentRules = getPaymentRules();

  const currentAmount = form.watch("paymentAmount") || "";
  const presetValues = paymentPresets.map(p => p.value);
  const isCustomAmount = currentAmount && !presetValues.includes(currentAmount);

  return (
    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3">Payment Information</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div>
          <Label htmlFor="paymentAmount" className="text-sm font-medium text-hostel-text">
            Amount (RM)
          </Label>
          <Select
            value={!isCustomAmount ? currentAmount || paymentPresets[0]?.value : "custom"}
            onValueChange={(value) => {
              if (value === "custom") {
                // Clear the field and let user type custom amount
                form.setValue("paymentAmount", "");
                return;
              }
              form.setValue("paymentAmount", value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select amount" />
            </SelectTrigger>
            <SelectContent>
              {/* REFACTORED: Use configuration-based presets instead of hardcoded values */}
              {paymentPresets.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom Amount...</SelectItem>
            </SelectContent>
          </Select>
          {isCustomAmount && (
            <Input
              id="customPaymentAmount"
              type="number"
              step="0.01"
              min="0"
              max={paymentRules.maxAmount}
              placeholder={`Enter custom amount (max: RM${paymentRules.maxAmount})`}
              className="w-full mt-2"
              value={currentAmount}
              onChange={(e) => form.setValue("paymentAmount", e.target.value)}
              autoFocus
            />
          )}
          {form.formState.errors.paymentAmount && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.paymentAmount.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="paymentMethod" className="text-sm font-medium text-hostel-text">
            Payment Method
          </Label>
          <Select
            value={form.watch("paymentMethod")}
            onValueChange={(value) => form.setValue("paymentMethod", value as "cash" | "tng" | "bank" | "platform")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              {/* REFACTORED: Use configuration-based payment methods */}
              {paymentMethods.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                  {method.isDefault && " (Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.paymentMethod && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.paymentMethod.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="paymentCollector" className="text-sm font-medium text-hostel-text">
            Payment Collector
          </Label>
          <Select
            value={form.watch("paymentCollector")}
            onValueChange={(value) => form.setValue("paymentCollector", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select payment collector" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={defaultCollector}>{defaultCollector} (Current User)</SelectItem>
              {/* REFACTORED: Consider making staff list configurable in future phases */}
              <SelectItem value="Alston">Alston</SelectItem>
              <SelectItem value="Jay">Jay</SelectItem>
              <SelectItem value="Le">Le</SelectItem>
              <SelectItem value="Kakar">Kakar</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.paymentCollector && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.paymentCollector.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}