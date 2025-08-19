import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { Bed, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { InsertGuest, Capsule } from "@shared/schema";

interface CapsuleAssignmentSectionProps {
  form: UseFormReturn<InsertGuest>;
  availableCapsules: (Capsule & { canAssign: boolean; warningLevel?: string; canManualAssign?: boolean })[];
  capsulesLoading: boolean;
}

export default function CapsuleAssignmentSection({ 
  form, 
  availableCapsules, 
  capsulesLoading 
}: CapsuleAssignmentSectionProps) {
  const labels = useAccommodationLabels();
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingCapsule, setPendingCapsule] = useState<string>("");
  const [warningMessage, setWarningMessage] = useState<string>("");

  // Helper function to get warning message for a capsule
  const getWarningMessage = (capsule: any): string | null => {
    if (capsule.toRent === false) {
      return `⚠️ WARNING: This ${labels.lowerSingular} is marked as "Not Suitable for Rent" due to major maintenance issues. Are you sure you want to assign it?`;
    }
    if (capsule.cleaningStatus === 'to_be_cleaned') {
      return `⚠️ WARNING: This ${labels.lowerSingular} needs cleaning before it can be assigned. Are you sure you want to assign it without cleaning?`;
    }
    return null;
  };

  // Handle capsule selection with warning check
  const handleCapsuleSelection = (value: string) => {
    const selectedCapsule = availableCapsules.find(c => c.number === value);
    if (!selectedCapsule) return;

    const warning = getWarningMessage(selectedCapsule);
    if (warning && !selectedCapsule.canAssign) {
      // Show warning dialog for problematic capsules
      setPendingCapsule(value);
      setWarningMessage(warning);
      setShowWarningDialog(true);
    } else {
      // Direct assignment for normal capsules
      form.setValue("capsuleNumber", value);
    }
  };

  // Confirm problematic capsule assignment
  const confirmAssignment = () => {
    form.setValue("capsuleNumber", pendingCapsule);
    setShowWarningDialog(false);
    setPendingCapsule("");
    setWarningMessage("");
  };

  // Cancel problematic capsule assignment
  const cancelAssignment = () => {
    setShowWarningDialog(false);
    setPendingCapsule("");
    setWarningMessage("");
  };

  return (
    <div>
      <Label htmlFor="capsuleNumber" className="flex items-center text-sm font-medium text-hostel-text mb-2">
        <Bed className="mr-2 h-4 w-4" />
        {labels.singular} Assignment *
      </Label>
      <div className="space-y-1 mb-2">
        <p className="text-xs text-gray-600">
          💡 Smart Assignment: Select gender first for automatic {labels.lowerSingular} recommendation!
        </p>
        <p className="text-xs text-orange-600">
          ⚠️ Orange {labels.lowerPlural} cannot be selected (may need cleaning, maintenance, or be temporarily unavailable).
        </p>
        <p className="text-xs text-red-600">
          🚫 Red {labels.lowerPlural} are not suitable for rent due to major maintenance issues.
        </p>
      </div>
      {capsulesLoading ? (
        <Skeleton className="w-full h-10" />
      ) : (
        <Select
          value={form.watch("capsuleNumber") || undefined}
          onValueChange={handleCapsuleSelection}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${labels.lowerSingular} (⭐ = bottom bed)`} />
          </SelectTrigger>
          <SelectContent>
            {availableCapsules.length === 0 ? (
              <SelectItem value="no-capsules" disabled>No {labels.lowerPlural} available</SelectItem>
            ) : (
              (() => {
                try {
                  // Validate and filter capsules with comprehensive error handling
                  const validCapsules = availableCapsules.filter(capsule => {
                    try {
                      if (!capsule || typeof capsule !== 'object') {
                        console.warn('Invalid capsule object (not an object):', capsule);
                        return false;
                      }
                      
                      if (!capsule.number || typeof capsule.number !== 'string') {
                        console.warn('Invalid capsule number:', capsule);
                        return false;
                      }
                      
                      const match = capsule.number.match(/^C(\d+)$/);
                      if (!match) {
                        console.warn('Capsule number does not match pattern:', capsule.number);
                        return false;
                      }
                      
                      const num = parseInt(match[1]);
                      if (isNaN(num)) {
                        console.warn('Capsule number is not a valid integer:', capsule.number);
                        return false;
                      }
                      
                      return true;
                    } catch (error) {
                      console.warn('Error validating capsule:', capsule, error);
                      return false;
                    }
                  });

                  // Sort capsules by sequential order: C1, C2, C3, C4... C20, C21, C24
                  const sortedCapsules = validCapsules.sort((a, b) => {
                    try {
                      const aMatch = a.number.match(/^C(\d+)$/);
                      const bMatch = b.number.match(/^C(\d+)$/);
                      
                      if (!aMatch || !bMatch) return 0;
                      
                      const aNum = parseInt(aMatch[1]);
                      const bNum = parseInt(bMatch[1]);
                      
                      // Simple sequential order: lowest number first
                      return aNum - bNum;
                    } catch (error) {
                      console.warn('Error sorting capsules:', a?.number, b?.number, error);
                      return 0;
                    }
                  });

                  // Map to SelectItems safely
                  return sortedCapsules.map((capsule) => {
                    try {
                      const match = capsule.number.match(/^C(\d+)$/);
                      if (!match) {
                        // Fallback for non-standard capsule numbers
                        return (
                          <SelectItem key={capsule.number} value={capsule.number}>
                            <div className="flex items-center justify-between w-full">
                              <span>{capsule.number}</span>
                              <span className="text-xs text-gray-500 capitalize">
                                {capsule.section || 'unknown'}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      }
                      
                      const capsuleNum = parseInt(match[1]);
                      const isBottom = capsuleNum % 2 === 0;
                      const position = isBottom ? "Bottom" : "Top";
                      const preference = isBottom ? "⭐" : ""; // Just star for bottom beds, no preference text
                      const genderMatch = form.watch("gender");
                      
                      let suitability = "";
                      if (genderMatch === "female" && capsule.section === "back") {
                        suitability = " 🎯 Recommended";
                      } else if (genderMatch && genderMatch !== "female" && capsule.section === "front" && isBottom) {
                        suitability = " 🎯 Recommended";
                      }
                      
                      // Show cleaning status and determine if capsule can be assigned
                      let statusIcon = "";
                      let statusText = "";
                      
                      if (!capsule.isAvailable) {
                        statusIcon = " ⚠️";
                        statusText = " Unavailable";
                      } else if (capsule.toRent === false) {
                        statusIcon = " 🚫";
                        statusText = " Not Suitable for Rent";
                      } else if (capsule.cleaningStatus === "cleaned") {
                        statusIcon = " ✨";
                        statusText = " Clean";
                      } else if (capsule.cleaningStatus === "to_be_cleaned") {
                        statusIcon = " 🔄";
                        statusText = " Needs Cleaning";
                      } else {
                        statusIcon = " ❓";
                        statusText = ` Status: ${capsule.cleaningStatus || 'Unknown'}`;
                      }
                      
                      const cleaningStatus = statusIcon + statusText;
                      // Only disable if truly unavailable (occupied), allow manual override for cleaning/maintenance issues
                      const isDisabled = !capsule.isAvailable || (capsule.canManualAssign === false);
                      
                      const labelText = `${capsule.number} - ${position} ${preference}${suitability}${cleaningStatus}`.trim();
                      const isNotSuitableForRent = capsule.toRent === false;
                      
                      return (
                        <SelectItem 
                          key={capsule.number} 
                          value={capsule.number} 
                          textValue={labelText}
                          disabled={isDisabled}
                          className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={isNotSuitableForRent ? "text-red-600 font-medium" : isDisabled ? "text-orange-600 font-medium" : ""}>
                              {capsule.number} - {position} {preference}{suitability}{cleaningStatus}
                            </span>
                            <span className={`text-xs capitalize ${isNotSuitableForRent ? "text-red-500" : isDisabled ? "text-orange-500" : "text-gray-500"}`}>
                              {capsule.section || 'unknown'}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    } catch (error) {
                      console.warn('Error rendering capsule:', capsule?.number, error);
                      // Return a safe fallback
                      return (
                        <SelectItem key={`fallback-${Math.random()}`} value={capsule?.number || ''} textValue={capsule?.number || 'Unknown'}>
                          <div className="flex items-center justify-between w-full">
                            <span>{capsule?.number || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">Error loading details</span>
                          </div>
                        </SelectItem>
                      );
                    }
                  });
                } catch (error) {
                  console.error('Critical error in capsule selection:', error);
                  // Return a safe fallback for the entire selection
                  return (
                    <SelectItem value="error" disabled>
                      Error loading capsules. Please refresh the page.
                    </SelectItem>
                  );
                }
              })()
            )}
          </SelectContent>
        </Select>
      )}
      {form.formState.errors.capsuleNumber && (
        <p className="text-hostel-error text-sm mt-1">{form.formState.errors.capsuleNumber.message}</p>
      )}

      {/* Warning Dialog for Problematic Capsule Assignment */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Assignment Warning
            </DialogTitle>
            <DialogDescription className="text-sm">
              {warningMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={cancelAssignment}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmAssignment}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Assign Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}