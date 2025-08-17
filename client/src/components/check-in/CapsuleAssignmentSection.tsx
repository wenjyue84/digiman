import { UseFormReturn } from "react-hook-form";
import { Bed } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { InsertGuest, Capsule } from "@shared/schema";

interface CapsuleAssignmentSectionProps {
  form: UseFormReturn<InsertGuest>;
  availableCapsules: (Capsule & { canAssign: boolean })[];
  capsulesLoading: boolean;
}

export default function CapsuleAssignmentSection({ 
  form, 
  availableCapsules, 
  capsulesLoading 
}: CapsuleAssignmentSectionProps) {
  const labels = useAccommodationLabels();

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
          ⚠️ Grey {labels.lowerPlural} cannot be selected (may need cleaning, maintenance, or be temporarily unavailable).
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
          onValueChange={(value) => form.setValue("capsuleNumber", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${labels.lowerSingular} (⭐ = bottom/preferred)`} />
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

                  // Sort capsules safely
                  const sortedCapsules = validCapsules.sort((a, b) => {
                    try {
                      const aMatch = a.number.match(/^C(\d+)$/);
                      const bMatch = b.number.match(/^C(\d+)$/);
                      
                      if (!aMatch || !bMatch) return 0;
                      
                      const aNum = parseInt(aMatch[1]);
                      const bNum = parseInt(bMatch[1]);
                      
                      const aIsBottom = aNum % 2 === 0;
                      const bIsBottom = bNum % 2 === 0;
                      
                      // Bottom capsules first
                      if (aIsBottom && !bIsBottom) return -1;
                      if (!aIsBottom && bIsBottom) return 1;
                      
                      // Within same position, sort by number
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
                      const preference = isBottom ? "⭐ Preferred" : "";
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
                      const isDisabled = !capsule.canAssign || capsule.toRent === false;
                      
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
                            <span className={isNotSuitableForRent ? "text-red-600 font-medium" : isDisabled ? "text-gray-400" : ""}>
                              {capsule.number} - {position} {preference}{suitability}{cleaningStatus}
                            </span>
                            <span className={`text-xs capitalize ${isNotSuitableForRent ? "text-red-500" : isDisabled ? "text-gray-400" : "text-gray-500"}`}>
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
    </div>
  );
}