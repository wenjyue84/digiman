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
  availableCapsules: (Capsule & { canAssign: boolean; warningLevel?: string; canManualAssign?: boolean; activeProblems?: any[] })[];
  capsulesLoading: boolean;
  isCapsuleLocked?: boolean;
}

export default function CapsuleAssignmentSection({ 
  form, 
  availableCapsules, 
  capsulesLoading,
  isCapsuleLocked = false
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
    
    // Check for active maintenance problems
    if (capsule.activeProblems && capsule.activeProblems.length > 0) {
      const problemDescriptions = capsule.activeProblems.map((p: any) => p.description).join(', ');
      const problemCount = capsule.activeProblems.length;
      
      return `🔧 MAINTENANCE WARNING: This ${labels.lowerSingular} has ${problemCount} active maintenance ${problemCount === 1 ? 'problem' : 'problems'}: ${problemDescriptions}. Are you sure you want to assign it?`;
    }
    
    return null;
  };

  // Handle capsule selection with warning check
  const handleCapsuleSelection = (value: string) => {
    const selectedCapsule = availableCapsules.find(c => c.number === value);
    if (!selectedCapsule) return;

    const warning = getWarningMessage(selectedCapsule);
    if (warning) {
      // Show warning dialog for all problematic capsules (cleaning, maintenance, or major issues)
      // This includes capsules with maintenance problems even if they can be assigned
      setPendingCapsule(value);
      setWarningMessage(warning);
      setShowWarningDialog(true);
    } else {
      // Direct assignment for normal capsules with no issues
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
        <p className="text-xs text-yellow-600">
          🔧 {labels.lowerPlural} with wrench icons have active maintenance problems but can still be assigned.
        </p>
        <p className="text-xs text-red-600">
          🚫 Red {labels.lowerPlural} are not suitable for rent due to major maintenance issues.
        </p>
      </div>
      {capsulesLoading ? (
        <Skeleton className="w-full h-10" />
      ) : (
        <div className="space-y-2">
          {isCapsuleLocked && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                🔒 Capsule selection is locked because it was pre-selected from Dashboard. 
                This bypasses smart gender-based assignment for quick guest entry.
              </p>
            </div>
          )}
          <Select
            value={form.watch("capsuleNumber") || undefined}
            onValueChange={handleCapsuleSelection}
            disabled={isCapsuleLocked}
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
                        console.warn('Error validating capsule:', error);
                        return false;
                      }
                    });
                    
                    if (validCapsules.length === 0) {
                      return <SelectItem value="no-valid-capsules" disabled>No valid capsules found</SelectItem>;
                    }
                    
                    // Sort capsules by number for better UX
                    const sortedCapsules = validCapsules.sort((a, b) => {
                      const aNum = parseInt(a.number.replace('C', ''));
                      const bNum = parseInt(b.number.replace('C', ''));
                      return aNum - bNum;
                    });
                    
                    return sortedCapsules.map(capsule => {
                      const isRecommended = capsule.canAssign;
                      const hasWarning = capsule.warningLevel === 'warning' || capsule.warningLevel === 'error';
                      const hasMaintenanceProblems = capsule.activeProblems && capsule.activeProblems.length > 0;
                      const isDisabled = !capsule.canManualAssign;
                      
                      return (
                        <SelectItem 
                          key={capsule.number} 
                          value={capsule.number}
                          disabled={isDisabled}
                          className={`
                            ${hasWarning ? 'text-orange-600' : ''}
                            ${hasMaintenanceProblems && !hasWarning ? 'text-yellow-600' : ''}
                            ${isRecommended ? 'font-medium' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{capsule.number}</span>
                            <div className="flex items-center gap-1">
                              {capsule.position === 'bottom' && <span title="Bottom bed">⭐</span>}
                              {hasMaintenanceProblems && <span title={`${capsule.activeProblems.length} maintenance ${capsule.activeProblems.length === 1 ? 'problem' : 'problems'}`}>🔧</span>}
                              {hasWarning && <span title="Warning">⚠️</span>}
                              {!isRecommended && <span title="Not recommended">🚫</span>}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    });
                  } catch (error) {
                    console.error('Error rendering capsule options:', error);
                    return <SelectItem value="error" disabled>Error loading capsules</SelectItem>;
                  }
                })()
              )}
            </SelectContent>
          </Select>
        </div>
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