import type { Guest } from "@shared/schema";
import { UnitSelector } from "./UnitSelector";
import type { AvailableCapsule } from "./types";

interface CapsuleSelectorProps {
  guest: Guest;
  isAuthenticated: boolean;
  availableCapsules: AvailableCapsule[];
  onCapsuleChange: (guest: Guest, newCapsuleNumber: string) => void;
}

// Backward-compatible wrapper while migration from capsule -> unit completes.
export function CapsuleSelector({
  guest,
  isAuthenticated,
  availableCapsules,
  onCapsuleChange,
}: CapsuleSelectorProps) {
  return (
    <UnitSelector
      guest={guest}
      isAuthenticated={isAuthenticated}
      availableUnits={availableCapsules}
      onUnitChange={onCapsuleChange}
    />
  );
}

export default CapsuleSelector;
