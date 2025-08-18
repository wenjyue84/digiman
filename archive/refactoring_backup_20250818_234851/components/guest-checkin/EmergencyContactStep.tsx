import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { ValidationHelpers } from "./shared/ValidationHelpers";

interface EmergencyContactStepProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
}

export function EmergencyContactStep({ 
  form, 
  errors, 
  t 
}: EmergencyContactStepProps) {
  return (
    <div className="space-y-6">
      {/* Emergency Contact */}
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <Users className="mr-2 h-4 w-4" />
          Emergency Contact
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
            <ValidationHelpers 
              errors={errors} 
              fieldName="emergencyContact" 
              hint={t.emergencyContactHint} 
            />
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
            <ValidationHelpers 
              errors={errors} 
              fieldName="emergencyPhone" 
              hint={t.emergencyPhoneHint} 
            />
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3">Additional Notes</h3>
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-hostel-text">
            Special Requirements or Notes
          </Label>
          {/* Quick-select common notes */}
          <div className="mt-2 mb-2">
            <div className="text-xs text-gray-700 mb-1 font-medium">{t.commonNotesTitle}</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                const cur = form.getValues("notes") || "";
                const v = t.commonNoteLateArrival;
                form.setValue("notes", cur ? `${cur}\n${v}` : v);
              }}>{t.commonNoteLateArrival}</button>
              <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                const cur = form.getValues("notes") || "";
                const v = t.commonNoteBottomCapsule;
                form.setValue("notes", cur ? `${cur}\n${v}` : v);
              }}>{t.commonNoteBottomCapsule}</button>
              <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                const cur = form.getValues("notes") || "";
                const v = t.commonNoteArriveEarly;
                form.setValue("notes", cur ? `${cur}\n${v}` : v);
              }}>{t.commonNoteArriveEarly}</button>
              <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                const cur = form.getValues("notes") || "";
                const v = t.commonNoteQuietArea;
                form.setValue("notes", cur ? `${cur}\n${v}` : v);
              }}>{t.commonNoteQuietArea}</button>
              <button type="button" className="px-2 py-1 text-xs border rounded-md hover:bg-white" onClick={() => {
                const cur = form.getValues("notes") || "";
                const v = t.commonNoteExtraBedding;
                form.setValue("notes", cur ? `${cur}\n${v}` : v);
              }}>{t.commonNoteExtraBedding}</button>
            </div>
          </div>
          <textarea
            id="notes"
            rows={3}
            placeholder="Any special requirements, allergies, accessibility needs, or additional notes..."
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            {...form.register("notes")}
          />
          <ValidationHelpers 
            errors={errors} 
            fieldName="notes" 
            hint={t.notesHint} 
          />
        </div>
      </div>
    </div>
  );
}
