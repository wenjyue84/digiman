import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Phone } from "lucide-react";
import type { InsertGuest } from "@shared/schema";

interface ContactInformationSectionProps {
  form: UseFormReturn<InsertGuest>;
}

export default function ContactInformationSection({ form }: ContactInformationSectionProps) {
  return (
    <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <Phone className="mr-2 h-4 w-4" />
        Contact Information <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <div>
          <Label htmlFor="phoneNumber" className="text-sm font-medium text-hostel-text">
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="e.g., +60123456789"
            className="mt-1"
            {...form.register("phoneNumber")}
          />
          {form.formState.errors.phoneNumber && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.phoneNumber.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium text-hostel-text">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="guest@example.com"
            className="mt-1"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.email.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}