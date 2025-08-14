import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, Camera, Calendar } from "lucide-react";
import { SmartPhotoUploader } from "@/components/SmartPhotoUploader";
import { NATIONALITIES } from "@/lib/nationalities";
import { getHolidayLabel, hasPublicHoliday } from "@/lib/holidays";
import type { InsertGuest } from "@shared/schema";

interface IdentificationPersonalSectionProps {
  form: UseFormReturn<InsertGuest>;
  profilePhotoUrl: string;
  setProfilePhotoUrl: (url: string) => void;
}

export default function IdentificationPersonalSection({ 
  form, 
  profilePhotoUrl, 
  setProfilePhotoUrl 
}: IdentificationPersonalSectionProps) {
  return (
    <div className="bg-orange-50 rounded-lg p-3 sm:p-4 border border-orange-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
        <CreditCard className="mr-2 h-4 w-4" />
        Identification & Personal Details <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Nationality FIRST */}
        <div>
          <Label htmlFor="nationality" className="text-sm font-medium text-hostel-text">
            Nationality
          </Label>
          <select
            id="nationality"
            className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            defaultValue="Malaysian"
            {...form.register("nationality")}
          >
            {NATIONALITIES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
          {form.formState.errors.nationality && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.nationality.message}</p>
          )}
        </div>

        {/* Dynamic IC/Passport number SECOND */}
        <div>
          <Label htmlFor="idNumber" className="text-sm font-medium text-hostel-text">
            {form.watch("nationality") === "Malaysian" ? "IC Number" : "Passport Number"}
          </Label>
          <Input
            id="idNumber"
            type="text"
            placeholder={form.watch("nationality") === "Malaysian" ? "IC Number" : "Passport Number"}
            className="mt-1"
            {...form.register("idNumber")}
          />
          {form.formState.errors.idNumber && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.idNumber.message}</p>
          )}
        </div>

        {/* Dynamic document photo THIRD */}
        <div>
          <Label className="text-sm font-medium text-hostel-text">
            <Camera className="mr-2 h-4 w-4 inline" />
            {form.watch("nationality") === "Malaysian" ? "IC Photo" : "Passport Photo"} 
            <span className="text-gray-500 text-xs ml-2">(Optional for admin)</span>
          </Label>
          <div className="mt-2 space-y-2">
            {profilePhotoUrl ? (
              <div className="flex items-center gap-3">
                <img 
                  src={profilePhotoUrl} 
                  alt="Profile" 
                  className="w-16 h-20 object-cover rounded border border-gray-300"
                />
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProfilePhotoUrl("")}
                    className="text-xs"
                  >
                    Remove Photo
                  </Button>
                  <span className="text-xs text-gray-500">
                    Photo uploaded successfully
                  </span>
                </div>
              </div>
            ) : (
              <SmartPhotoUploader
                onPhotoSelected={(photoUrl, photoData) => {
                  setProfilePhotoUrl(photoUrl);
                  // Store additional metadata if needed
                  if (photoData) {
                    console.log('Photo metadata:', {
                      name: photoData.name,
                      size: photoData.size,
                      type: photoData.type
                    });
                  }
                }}
                buttonText={`Upload ${form.watch("nationality") === "Malaysian" ? "IC Photo" : "Passport Photo"}`}
                className="w-full"
              />
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="expectedCheckoutDate" className="text-sm font-medium text-hostel-text flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            Expected Checkout Date
          </Label>
          <Input
            id="expectedCheckoutDate"
            type="date"
            className="mt-1"
            {...form.register("expectedCheckoutDate")}
          />
          {(() => {
            const dateStr = form.watch("expectedCheckoutDate");
            const label = getHolidayLabel(dateStr);
            if (!label) return null;
            const isPH = hasPublicHoliday(dateStr);
            return (
              <div className={`${isPH ? "text-green-700 bg-green-50 border-green-200" : "text-blue-700 bg-blue-50 border-blue-200"} mt-2 text-sm rounded border p-2 flex items-start gap-2`}
              >
                <span>{isPH ? "🎉" : "🗓️"}</span>
                <span>
                  {isPH ? "Public holiday" : "Festival"}: {label}. Consider extending stay to enjoy the celebrations.
                </span>
              </div>
            );
          })()}
          {form.formState.errors.expectedCheckoutDate && (
            <p className="text-hostel-error text-sm mt-1">{form.formState.errors.expectedCheckoutDate.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}