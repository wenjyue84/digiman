import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter as FilterIcon, Building2 } from "lucide-react";
import type { GuestFilters } from "./types";

interface GuestFilterPopoverProps {
  isMobile: boolean;
  filters: GuestFilters;
  setFilters: React.Dispatch<React.SetStateAction<GuestFilters>>;
  hasActiveGuestFilters: boolean;
  showAllUnits: boolean;
  setshowAllUnits: (val: boolean) => void;
  isAuthenticated: boolean;
  onUpdateSetting: (val: boolean) => void;
  onWhatsAppExport: () => void;
  clearFilters: () => void;
}

export function GuestFilterPopover({
  isMobile,
  filters,
  setFilters,
  hasActiveGuestFilters,
  showAllUnits,
  setshowAllUnits,
  isAuthenticated,
  onUpdateSetting,
  onWhatsAppExport,
  clearFilters,
}: GuestFilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={isMobile ? "h-8 w-8 px-0" : "h-8 gap-2"}
          title="Filter guests"
        >
          <FilterIcon className="h-4 w-4" />
          {!isMobile && "Filter Guests"}
          {hasActiveGuestFilters && (
            <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-600" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Gender</Label>
            <RadioGroup
              value={filters.gender}
              onValueChange={(val) => setFilters(prev => ({ ...prev, gender: val as any }))}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="gender-any" value="any" />
                <Label htmlFor="gender-any">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="gender-male" value="male" />
                <Label htmlFor="gender-male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="gender-female" value="female" />
                <Label htmlFor="gender-female">Female</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Nationality</Label>
            <RadioGroup
              value={filters.nationality}
              onValueChange={(val) => setFilters(prev => ({ ...prev, nationality: val as any }))}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="nat-any" value="any" />
                <Label htmlFor="nat-any">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="nat-my" value="malaysian" />
                <Label htmlFor="nat-my">Malaysian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="nat-nonmy" value="non-malaysian" />
                <Label htmlFor="nat-nonmy">Non-MY</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Quick filters</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.outstandingOnly}
                  onCheckedChange={(val) => setFilters(prev => ({ ...prev, outstandingOnly: Boolean(val) }))}
                />
                Outstanding payment only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filters.checkoutTodayOnly}
                  onCheckedChange={(val) => setFilters(prev => ({ ...prev, checkoutTodayOnly: Boolean(val) }))}
                />
                Expected to check out today
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Unit Display</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={showAllUnits}
                  onCheckedChange={(val) => {
                    const newValue = Boolean(val);
                    setshowAllUnits(newValue);
                    if (isAuthenticated) {
                      onUpdateSetting(newValue);
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Show all units
                </div>
              </label>
              {showAllUnits && (
                <p className="text-xs text-gray-500 ml-6">
                  Empty units will be shown with red background
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onWhatsAppExport}
                className="w-full text-xs"
              >
                Export to WhatsApp
              </Button>
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
