import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InsertGuest } from "@shared/schema";

interface PaymentInformationSectionProps {
  form: UseFormReturn<InsertGuest>;
  defaultCollector: string;
}

export default function PaymentInformationSection({ form, defaultCollector }: PaymentInformationSectionProps) {

  return (
    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3">Payment Information</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div>
          <Label htmlFor="paymentAmount" className="text-sm font-medium text-hostel-text">
            Amount (RM)
          </Label>
          <Select
            value={["45", "48", "650"].includes(form.watch("paymentAmount") || "45") ? form.watch("paymentAmount") || "45" : "custom"}
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
              <SelectItem value="45">RM45 (Standard)</SelectItem>
              <SelectItem value="48">RM48 (Premium)</SelectItem>
              <SelectItem value="650">RM650 (Monthly Package)</SelectItem>
              <SelectItem value="custom">Custom Amount...</SelectItem>
            </SelectContent>
          </Select>
          {!["45", "48", "650"].includes(form.watch("paymentAmount") || "") && (
            <Input
              id="customPaymentAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter custom amount (e.g., 35.50)"
              className="w-full mt-2"
              value={form.watch("paymentAmount") || ""}
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
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="tng">Touch 'n Go</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
              <SelectItem value="platform">Online Platform</SelectItem>
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
