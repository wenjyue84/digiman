import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import type { InsertGuest } from "@shared/schema";

interface EmergencyContactSectionProps {
  form: UseFormReturn<InsertGuest>;
}

export default function EmergencyContactSection({ form }: EmergencyContactSectionProps) {
  return (
    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <Users className="mr-2 h-4 w-4" />
        Emergency Contact (Optional)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emergencyContact" className="text-sm font-medium text-hostel-text">
            Emergency Contact Name
          </Label>
          <Input
            id="emergencyContact"
            type="text"
            placeholder="Full name of emergency contact"
            className="mt-1"
            {...form.register("emergencyContact")}
          />
          {form.formState.errors.emergencyContact && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.emergencyContact.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="emergencyPhone" className="text-sm font-medium text-hostel-text">
            Emergency Contact Phone
          </Label>
          <Input
            id="emergencyPhone"
            type="tel"
            placeholder="Emergency contact phone number"
            className="mt-1"
            {...form.register("emergencyPhone")}
          />
          {form.formState.errors.emergencyPhone && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.emergencyPhone.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
