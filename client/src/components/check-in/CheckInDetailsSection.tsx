import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { getCurrentDateTime } from "@/components/check-in/utils";
import type { InsertGuest } from "@shared/schema";

interface CheckInDetailsSectionProps {
  form: UseFormReturn<InsertGuest>;
}

export default function CheckInDetailsSection({ form }: CheckInDetailsSectionProps) {
  const { timeString } = getCurrentDateTime();

  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <h3 className="text-sm font-medium text-hostel-text mb-3">Check-in Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Date:</span>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={form.watch("checkInDate") || ""}
              onChange={(e) => form.setValue("checkInDate", e.target.value)}
              className="w-32 text-sm"
            />
            <span className="text-xs text-gray-500">(Editable)</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Time:</span>
          <span className="font-medium">{timeString}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Staff:</span>
          <span className="font-medium">Admin User</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-hostel-accent bg-opacity-10 text-hostel-accent">
            Pending Check-in
          </span>
        </div>
      </div>
    </div>
  );
}
