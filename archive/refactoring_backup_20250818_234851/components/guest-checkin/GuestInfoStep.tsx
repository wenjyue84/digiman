import { User, Phone, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { ValidationHelpers } from "./shared/ValidationHelpers";

interface GuestInfoStepProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
}

export function GuestInfoStep({ 
  form, 
  errors, 
  t
}: GuestInfoStepProps) {

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <User className="mr-2 h-4 w-4" />
          {t.personalInfo}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="nameAsInDocument" className="text-sm font-medium text-hostel-text">
              {t.fullNameLabel}
            </Label>
            <Input
              id="nameAsInDocument"
              type="text"
              placeholder={t.fullNamePlaceholder}
              className="w-full mt-1"
              autoComplete="name"
              {...form.register("nameAsInDocument")}
            />
            <ValidationHelpers 
              errors={errors} 
              fieldName="nameAsInDocument" 
              hint={t.nameHint} 
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="phoneNumber" className="text-sm font-medium text-hostel-text flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t.contactNumberLabel}
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder={t.contactNumberPlaceholder}
              className="w-full mt-1"
              autoComplete="tel"
              inputMode="tel"
              {...form.register("phoneNumber")}
            />
            <ValidationHelpers 
              errors={errors} 
              fieldName="phoneNumber" 
              hint={t.phoneHint} 
            />
          </div>
          
          <div>
            <Label htmlFor="gender" className="text-sm font-medium text-hostel-text">
              {t.genderLabel}
            </Label>
            <Select
              value={form.watch("gender") || ""}
              onValueChange={(value) => form.setValue("gender", value as "male" | "female" | "other" | "prefer-not-to-say")}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder={t.genderPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t.male}</SelectItem>
                <SelectItem value="female">{t.female}</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            <ValidationHelpers 
              errors={errors} 
              fieldName="gender" 
              hint={t.genderHint} 
            />
          </div>
          
        </div>
      </div>

      {/* Check-in & Check-out Dates */}
      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          Check-in & Check-out Dates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkInDate" className="text-sm font-medium text-hostel-text">
              Check-in Date <span className="text-gray-500 text-xs">(Editable)</span>
            </Label>
            <Input
              id="checkInDate"
              type="date"
              className="w-full mt-1"
              {...form.register("checkInDate")}
            />
            <p className="text-xs text-gray-500 mt-1">
              Defaults to today's date ({new Date().toLocaleDateString()}). Change if you plan to arrive on a different date.
            </p>
            <ValidationHelpers 
              errors={errors} 
              fieldName="checkInDate" 
            />
          </div>
          
          <div>
            <Label htmlFor="checkOutDate" className="text-sm font-medium text-hostel-text">
              Check-out Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="checkOutDate"
              type="date"
              className="w-full mt-1"
              required
              {...form.register("checkOutDate", { required: "Check-out date is required" })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Defaults to tomorrow ({new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString()}). Change to your planned check-out date.
            </p>
            <ValidationHelpers 
              errors={errors} 
              fieldName="checkOutDate" 
            />
          </div>
        </div>
      </div>

      {/* Nationality - Isolated Section */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3">
          Nationality Information
        </h3>
        <div>
          <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
            Nationality
          </Label>
          <NationalitySelect
            value={form.watch("nationality") || ""}
            onValueChange={(value) => {
              // Direct form update with error handling
              try {
                if (form && form.setValue) {
                  form.setValue("nationality", value);
                }
              } catch (error) {
                console.log('Nationality update error:', error);
              }
            }}
            defaultValue="Malaysian"
            className="w-full mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select your nationality from the dropdown
          </p>
        </div>
      </div>
    </div>
  );
}
