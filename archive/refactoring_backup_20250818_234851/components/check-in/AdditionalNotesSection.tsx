import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { InsertGuest } from "@shared/schema";

interface AdditionalNotesSectionProps {
  form: UseFormReturn<InsertGuest>;
}

export default function AdditionalNotesSection({ form }: AdditionalNotesSectionProps) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-sm font-medium text-hostel-text mb-3">Additional Notes (Optional)</h3>
      
      {/* Early/Late Check-in Options */}
      <div className="mb-3 flex gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2 rounded border-gray-300"
            onChange={(e) => {
              if (e.target.checked) {
                const currentNotes = form.getValues("notes") || "";
                form.setValue("notes", currentNotes + (currentNotes ? "\n" : "") + "Early check-in requested at: ");
              } else {
                const currentNotes = form.getValues("notes") || "";
                form.setValue("notes", currentNotes.replace(/\nEarly check-in requested at:.*/, "").replace(/^Early check-in requested at:.*/, ""));
              }
            }}
          />
          <span className="text-sm">Early Check-in</span>
        </label>
        
        <label className="flex items-center">
          <input
            type="checkbox"
            className="mr-2 rounded border-gray-300"
            onChange={(e) => {
              if (e.target.checked) {
                const currentNotes = form.getValues("notes") || "";
                form.setValue("notes", currentNotes + (currentNotes ? "\n" : "") + "Late check-in requested at: ");
              } else {
                const currentNotes = form.getValues("notes") || "";
                form.setValue("notes", currentNotes.replace(/\nLate check-in requested at:.*/, "").replace(/^Late check-in requested at:.*/, ""));
              }
            }}
          />
          <span className="text-sm">Late Check-in</span>
        </label>
      </div>
      
      <div>
        <Label htmlFor="notes" className="text-sm font-medium text-hostel-text">
          Special Requirements or Notes
        </Label>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Any special requirements, allergies, accessibility needs, or additional notes..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-hostel-primary focus:ring-hostel-primary sm:text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}