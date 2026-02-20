import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";

interface AdditionalNotesSectionProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
}

export function AdditionalNotesSection({ form, errors, t }: AdditionalNotesSectionProps) {
  const addCommonNote = (noteText: string) => {
    const currentNotes = form.getValues("notes") || "";
    form.setValue("notes", currentNotes ? `${currentNotes}\n${noteText}` : noteText);
  };

  return (
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
            <button 
              type="button" 
              className="px-2 py-1 text-xs border rounded-md hover:bg-white" 
              onClick={() => addCommonNote(t.commonNoteLateArrival)}
            >
              {t.commonNoteLateArrival}
            </button>
            <button 
              type="button" 
              className="px-2 py-1 text-xs border rounded-md hover:bg-white" 
              onClick={() => addCommonNote(t.commonNoteBottomCapsule)}
            >
              {t.commonNoteBottomCapsule}
            </button>
            <button 
              type="button" 
              className="px-2 py-1 text-xs border rounded-md hover:bg-white" 
              onClick={() => addCommonNote(t.commonNoteArriveEarly)}
            >
              {t.commonNoteArriveEarly}
            </button>
            <button 
              type="button" 
              className="px-2 py-1 text-xs border rounded-md hover:bg-white" 
              onClick={() => addCommonNote(t.commonNoteQuietArea)}
            >
              {t.commonNoteQuietArea}
            </button>
            <button 
              type="button" 
              className="px-2 py-1 text-xs border rounded-md hover:bg-white" 
              onClick={() => addCommonNote(t.commonNoteExtraBedding)}
            >
              {t.commonNoteExtraBedding}
            </button>
          </div>
        </div>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Any special requirements, allergies, accessibility needs, or additional notes..."
          className="mt-1"
          {...form.register("notes")}
        />
        <p className="text-xs text-gray-500 mt-1">{t.notesHint}</p>
        {form.formState.errors.notes && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.notes.message}</p>
        )}
      </div>
    </div>
  );
}
