import { useState } from "react";
import { UseFormReturn, FieldErrors } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users } from "lucide-react";
import { GuestSelfCheckin } from "@shared/schema";

interface EmergencyContactSectionProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: FieldErrors<GuestSelfCheckin>;
  t: any; // i18n translations object
}

export function EmergencyContactSection({ form, errors, t }: EmergencyContactSectionProps) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <Users className="mr-2 h-4 w-4" />
        Emergency Contact
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="emergencyContact"
            className="text-sm font-medium text-hostel-text cursor-pointer"
            onClick={() => setShowHint((prev) => !prev)}
          >
            Emergency Contact Name
          </Label>
          <Input
            id="emergencyContact"
            type="text"
            placeholder="Full name of emergency contact"
            className="mt-1"
            {...form.register("emergencyContact")}
          />
          {showHint && (
            <p className="text-xs text-gray-500 mt-1">{t.emergencyContactHint}</p>
          )}
          {errors.emergencyContact && (
            <p className="text-red-500 text-sm mt-1">{errors.emergencyContact.message}</p>
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
            autoComplete="tel"
            inputMode="tel"
            {...form.register("emergencyPhone")}
          />
          <p className="text-xs text-gray-500 mt-1">{t.emergencyPhoneHint}</p>
          {errors.emergencyPhone && (
            <p className="text-red-500 text-sm mt-1">{errors.emergencyPhone.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
