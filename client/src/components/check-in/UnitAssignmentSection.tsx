import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { Bed, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";
import type { InsertGuest, Unit } from "@shared/schema";

interface UnitAssignmentSectionProps {
  form: UseFormReturn<InsertGuest>;
  availableUnits: (Unit & { canAssign: boolean; warningLevel?: string; canManualAssign?: boolean; activeProblems?: any[] })[];
  unitsLoading: boolean;
  isUnitLocked?: boolean;
}

export default function UnitAssignmentSection({ 
  form, 
  availableUnits, 
  unitsLoading,
  isUnitLocked = false
}: UnitAssignmentSectionProps) {
  const labels = useAccommodationLabels();
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [pendingUnit, setPendingUnit] = useState<string>("");
  const [warningMessage, setWarningMessage] = useState<string>("");

  // Helper function to get warning message for a unit
  const getWarningMessage = (unit: any): string | null => {
    if (unit.toRent === false) {
      return `⚠️ WARNING: This ${labels.lowerSingular} is marked as "Not Suitable for Rent" due to major maintenance issues. Are you sure you want to assign it?`;
    }
    if (unit.cleaningStatus === 'to_be_cleaned') {
      return `⚠️ WARNING: This ${labels.lowerSingular} needs cleaning before it can be assigned. Are you sure you want to assign it without cleaning?`;
    }
    
    // Check for active maintenance problems
    if (unit.activeProblems && unit.activeProblems.length > 0) {
      const problemDescriptions = unit.activeProblems.map((p: any) => p.description).join(', ');
      const problemCount = unit.activeProblems.length;
      
      return `🔧 MAINTENANCE WARNING: This ${labels.lowerSingular} has ${problemCount} active maintenance ${problemCount === 1 ? 'problem' : 'problems'}: ${problemDescriptions}. Are you sure you want to assign it?`;
    }
    
    return null;
  };

  // Handle unit selection with warning check
  const handleUnitSelection = (value: string) => {
    const selectedUnit = availableUnits.find(c => c.number === value);
    if (!selectedUnit) return;

    const warning = getWarningMessage(selectedUnit);
    if (warning) {
      // Show warning dialog for all problematic units (cleaning, maintenance, or major issues)
      // This includes units with maintenance problems even if they can be assigned
      setPendingUnit(value);
      setWarningMessage(warning);
      setShowWarningDialog(true);
    } else {
      // Direct assignment for normal units with no issues
      form.setValue("unitNumber", value);
    }
  };

  // Confirm problematic unit assignment
  const confirmAssignment = () => {
    form.setValue("unitNumber", pendingUnit);
    setShowWarningDialog(false);
    setPendingUnit("");
    setWarningMessage("");
  };

  // Cancel problematic unit assignment
  const cancelAssignment = () => {
    setShowWarningDialog(false);
    setPendingUnit("");
    setWarningMessage("");
  };

  return (
    <div>
      <Label htmlFor="unitNumber" className="flex items-center text-sm font-medium text-hostel-text mb-2">
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
      {unitsLoading ? (
        <Skeleton className="w-full h-10" />
      ) : (
        <div className="space-y-2">
          {isUnitLocked && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                🔒 Unit selection is locked because it was pre-selected from Dashboard. 
                This bypasses smart gender-based assignment for quick guest entry.
              </p>
            </div>
          )}
          <Select
            value={form.watch("unitNumber") || undefined}
            onValueChange={handleUnitSelection}
            disabled={isUnitLocked}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${labels.lowerSingular} (⭐ = bottom bed)`} />
            </SelectTrigger>
            <SelectContent>
              {availableUnits.length === 0 ? (
                <SelectItem value="no-units" disabled>No {labels.lowerPlural} available</SelectItem>
              ) : (
                (() => {
                  try {
                    // Validate and filter units with comprehensive error handling
                    const validUnits = availableUnits.filter(unit => {
                      try {
                        if (!unit || typeof unit !== 'object') {
                          console.warn('Invalid unit object (not an object):', unit);
                          return false;
                        }
                        
                        if (!unit.number || typeof unit.number !== 'string') {
                          console.warn('Invalid unit number:', unit);
                          return false;
                        }
                        
                        const match = unit.number.match(/^C(\d+)$/);
                        if (!match) {
                          console.warn('Unit number does not match pattern:', unit.number);
                          return false;
                        }
                        
                        const num = parseInt(match[1]);
                        if (isNaN(num)) {
                          console.warn('Unit number is not a valid integer:', unit.number);
                          return false;
                        }
                        
                        return true;
                      } catch (error) {
                        console.warn('Error validating unit:', error);
                        return false;
                      }
                    });
                    
                    if (validUnits.length === 0) {
                      return <SelectItem value="no-valid-units" disabled>No valid units found</SelectItem>;
                    }
                    
                    // Sort units by number for better UX
                    const sortedUnits = validUnits.sort((a, b) => {
                      const aNum = parseInt(a.number.replace('C', ''));
                      const bNum = parseInt(b.number.replace('C', ''));
                      return aNum - bNum;
                    });
                    
                    return sortedUnits.map(unit => {
                      const isRecommended = unit.canAssign;
                      const hasWarning = unit.warningLevel === 'warning' || unit.warningLevel === 'error';
                      const hasMaintenanceProblems = unit.activeProblems && unit.activeProblems.length > 0;
                      const isDisabled = !unit.canManualAssign;
                      
                      return (
                        <SelectItem 
                          key={unit.number} 
                          value={unit.number}
                          disabled={isDisabled}
                          className={`
                            ${hasWarning ? 'text-orange-600' : ''}
                            ${hasMaintenanceProblems && !hasWarning ? 'text-yellow-600' : ''}
                            ${isRecommended ? 'font-medium' : ''}
                          `}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{unit.number}</span>
                            <div className="flex items-center gap-1">
                              {unit.position === 'bottom' && <span title="Bottom bed">⭐</span>}
                              {hasMaintenanceProblems && <span title={`${unit.activeProblems?.length || 0} maintenance ${(unit.activeProblems?.length || 0) === 1 ? 'problem' : 'problems'}`}>🔧</span>}
                              {hasWarning && <span title="Warning">⚠️</span>}
                              {!isRecommended && <span title="Not recommended">🚫</span>}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    });
                  } catch (error) {
                    console.error('Error rendering unit options:', error);
                    return <SelectItem value="error" disabled>Error loading units</SelectItem>;
                  }
                })()
              )}
            </SelectContent>
          </Select>
        </div>
      )}
      {form.formState.errors.unitNumber && (
        <p className="text-hostel-error text-sm mt-1">{form.formState.errors.unitNumber.message}</p>
      )}

      {/* Warning Dialog for Problematic Unit Assignment */}
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
