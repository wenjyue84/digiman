import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Undo2, ToggleLeft, ToggleRight, LogOut } from "lucide-react";
import { GuestFilterPopover } from "./GuestFilterPopover";
import type { GuestFilters } from "./types";

interface GuestTableHeaderProps {
  showAllUnits: boolean;
  occupancy: { total: number; occupied: number; available: number } | undefined;
  allUnitsCount: number;
  isMobile: boolean;
  isAuthenticated: boolean;
  isCondensedView: boolean;
  setIsCondensedView: (val: boolean) => void;
  // Undo
  onUndo: () => void;
  isUndoPending: boolean;
  // Filter
  filters: GuestFilters;
  setFilters: React.Dispatch<React.SetStateAction<GuestFilters>>;
  hasActiveGuestFilters: boolean;
  setshowAllUnits: (val: boolean) => void;
  onUpdateSetting: (val: boolean) => void;
  onWhatsAppExport: () => void;
  clearFilters: () => void;
  // Auth
  logout: () => void;
}

export function GuestTableHeader({
  showAllUnits,
  occupancy,
  allUnitsCount,
  isMobile,
  isAuthenticated,
  isCondensedView,
  setIsCondensedView,
  onUndo,
  isUndoPending,
  filters,
  setFilters,
  hasActiveGuestFilters,
  setshowAllUnits,
  onUpdateSetting,
  onWhatsAppExport,
  clearFilters,
  logout,
}: GuestTableHeaderProps) {
  return (
    <CardHeader className="pb-4">
      <div className="flex justify-between items-center">
        <CardTitle className="text-lg font-bold text-hostel-text flex items-center">
          {showAllUnits ? "All Units" : "Current Guest"}
          {occupancy && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              {showAllUnits
                ? `(${occupancy.occupied}/${allUnitsCount || occupancy.total})`
                : `(${occupancy.occupied}/${occupancy.total})`
              }
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={isMobile ? "h-8 w-8 px-0" : "h-8 gap-2"}
            onClick={onUndo}
            disabled={isUndoPending}
            title="Undo recent checkout"
          >
            <Undo2 className="h-4 w-4" />
            {!isMobile && "Undo"}
          </Button>
          <GuestFilterPopover
            isMobile={isMobile}
            filters={filters}
            setFilters={setFilters}
            hasActiveGuestFilters={hasActiveGuestFilters}
            showAllUnits={showAllUnits}
            setshowAllUnits={setshowAllUnits}
            isAuthenticated={isAuthenticated}
            onUpdateSetting={onUpdateSetting}
            onWhatsAppExport={onWhatsAppExport}
            clearFilters={clearFilters}
          />
          {/* Mobile: icons with tooltips */}
          <div className="md:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleLeft className="h-4 w-4 text-gray-600" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Condensed</TooltipContent>
            </Tooltip>
          </div>
          {/* Desktop: text label */}
          <span className="hidden md:inline text-xs text-gray-600">Condensed</span>
          <Switch
            checked={!isCondensedView}
            onCheckedChange={(checked) => setIsCondensedView(!checked)}
          />
          {/* Desktop: text label */}
          <span className="hidden md:inline text-xs text-gray-600">Detailed</span>
          {/* Mobile: icons with tooltips */}
          <div className="md:hidden">
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleRight className="h-4 w-4 text-gray-600" />
              </TooltipTrigger>
              <TooltipContent side="bottom">Detailed</TooltipContent>
            </Tooltip>
          </div>
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 md:hidden"
              onClick={logout}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </CardHeader>
  );
}
