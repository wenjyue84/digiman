import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InsertGuest } from "@shared/schema";

interface DepositSectionProps {
  form: UseFormReturn<InsertGuest>;
}

export default function DepositSection({ form }: DepositSectionProps) {
  const depositRequired = form.watch("depositRequired");

  return (
    <div className="bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-hostel-text">Deposit</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="depositRequired" className="text-sm text-hostel-text-secondary">
            Require deposit
          </Label>
          <Switch
            id="depositRequired"
            checked={!!depositRequired}
            onCheckedChange={(checked) => {
              form.setValue("depositRequired", checked);
              if (!checked) {
                form.setValue("depositPaid", false);
                form.setValue("depositAmount", undefined);
                form.setValue("depositMethod", undefined);
              }
            }}
          />
        </div>
      </div>

      {depositRequired && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div>
            <Label htmlFor="depositAmount" className="text-sm font-medium text-hostel-text">
              Deposit Amount (RM)
            </Label>
            <Input
              id="depositAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 50.00"
              value={form.watch("depositAmount") || ""}
              onChange={(e) => form.setValue("depositAmount", e.target.value)}
            />
            {form.formState.errors.depositAmount && (
              <p className="text-hostel-error text-sm mt-1">{form.formState.errors.depositAmount.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="depositMethod" className="text-sm font-medium text-hostel-text">
              Deposit Method
            </Label>
            <Select
              value={form.watch("depositMethod") || ""}
              onValueChange={(value) => form.setValue("depositMethod", value as "cash" | "tng" | "bank" | "platform")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="tng">Touch 'n Go</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="platform">Online Platform</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2 pb-1">
              <Switch
                id="depositPaid"
                checked={!!form.watch("depositPaid")}
                onCheckedChange={(checked) => form.setValue("depositPaid", checked)}
              />
              <Label htmlFor="depositPaid" className="text-sm font-medium text-hostel-text">
                Deposit Paid
              </Label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
