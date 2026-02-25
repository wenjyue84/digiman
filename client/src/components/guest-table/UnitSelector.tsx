import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Guest } from "@shared/schema";
import { compareUnitNumbers } from "./useGuestSorting";
import type { AvailableUnit } from "./types";

interface UnitSelectorProps {
  guest: Guest;
  isAuthenticated: boolean;
  availableUnits: AvailableUnit[];
  onUnitChange: (guest: Guest, newUnitNumber: string) => void;
}

export function UnitSelector({ guest, isAuthenticated, availableUnits, onUnitChange }: UnitSelectorProps) {
  const { toast } = useToast();
  const currentUnit = guest.unitNumber;

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => {
          toast({
            title: "Authentication Required",
            description: "Please login to change unit assignments",
            variant: "destructive",
          });
          const currentPath = window.location.pathname;
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
        title="Click to login and change unit"
      >
        {currentUnit}
      </button>
    );
  }

  const unitOptions = [
    { number: currentUnit, isCurrent: true },
    ...availableUnits
      .filter(c => c.number !== currentUnit && c.toRent)
      .map(c => ({ number: c.number, isCurrent: false }))
  ].sort((a, b) => compareUnitNumbers(a.number, b.number));

  return (
    <Select
      value={currentUnit}
      onValueChange={(newUnit) => onUnitChange(guest, newUnit)}
    >
      <SelectTrigger className="w-16 h-8 text-xs">
        <SelectValue>{currentUnit}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {unitOptions.map((option) => (
          <SelectItem
            key={option.number}
            value={option.number}
            className={option.isCurrent ? "font-medium bg-blue-50" : ""}
          >
            {option.number}
            {option.isCurrent && " (current)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
