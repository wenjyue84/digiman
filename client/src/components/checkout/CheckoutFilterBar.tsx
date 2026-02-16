/**
 * Filter controls popover for the checkout page.
 * Contains gender, nationality, capsule, length-of-stay, date range,
 * and quick-filter (outstanding / checkout-today) controls.
 */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter as FilterIcon } from "lucide-react";
import type { CheckoutFilters } from "./checkout-types";

interface CheckoutFilterBarProps {
  filters: CheckoutFilters;
  setFilters: React.Dispatch<React.SetStateAction<CheckoutFilters>>;
  hasActiveFilters: boolean;
  uniqueCapsules: string[];
  availableNationalities: string[];
  setCheckinDateShortcut: (type: 'today' | 'yesterday' | 'tomorrow') => void;
  setExpectedCheckoutDateShortcut: (type: 'today' | 'yesterday' | 'tomorrow') => void;
  clearFilters: () => void;
}

export function CheckoutFilterBar({
  filters,
  setFilters,
  hasActiveFilters,
  uniqueCapsules,
  availableNationalities,
  setCheckinDateShortcut,
  setExpectedCheckoutDateShortcut,
  clearFilters,
}: CheckoutFilterBarProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 sm:h-9 gap-2">
          <FilterIcon className="h-4 w-4" />
          Filter Guests
          {hasActiveFilters && <span className="ml-1 inline-block h-2 w-2 rounded-full bg-blue-600" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          {/* Gender */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Gender</Label>
            <RadioGroup
              value={filters.gender}
              onValueChange={(val) => setFilters(prev => ({ ...prev, gender: val as any }))}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="co-gender-any" value="any" />
                <Label htmlFor="co-gender-any">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="co-gender-male" value="male" />
                <Label htmlFor="co-gender-male">Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="co-gender-female" value="female" />
                <Label htmlFor="co-gender-female">Female</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Nationality (General) */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Nationality (General)</Label>
            <RadioGroup
              value={filters.nationality}
              onValueChange={(val) => setFilters(prev => ({ ...prev, nationality: val as any }))}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="co-nat-any" value="any" />
                <Label htmlFor="co-nat-any">Any</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="co-nat-my" value="malaysian" />
                <Label htmlFor="co-nat-my">Malaysian</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem id="co-nat-nonmy" value="non-malaysian" />
                <Label htmlFor="co-nat-nonmy">Non&#x2011;MY</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Specific Nationality */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Specific Nationality</Label>
            <Select value={filters.specificNationality} onValueChange={(val) => setFilters(prev => ({ ...prev, specificNationality: val }))}>
              <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-xs">
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any nationality</SelectItem>
                {availableNationalities.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>
                    {nationality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Capsule Assignment */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Capsule Assignment</Label>
            <Select value={filters.capsuleNumber} onValueChange={(val) => setFilters(prev => ({ ...prev, capsuleNumber: val }))}>
              <SelectTrigger className="h-11 sm:h-9 text-sm sm:text-xs">
                <SelectValue placeholder="Select capsule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any capsule</SelectItem>
                {uniqueCapsules.map((capsule) => (
                  <SelectItem key={capsule} value={capsule}>
                    Capsule {capsule}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Length of Stay */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Length of Stay (Days)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-gray-500">Min days</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Min"
                  value={filters.lengthOfStayMin}
                  onChange={(e) => setFilters(prev => ({ ...prev, lengthOfStayMin: e.target.value }))}
                  className="h-11 sm:h-9 text-sm sm:text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Max days</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Max"
                  value={filters.lengthOfStayMax}
                  onChange={(e) => setFilters(prev => ({ ...prev, lengthOfStayMax: e.target.value }))}
                  className="h-11 sm:h-9 text-sm sm:text-xs"
                />
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-gray-500">Date Filters</Label>
            <div className="space-y-3">
              {/* Check-in Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Check-in Date Range</Label>
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCheckinDateShortcut('yesterday')} className="text-sm sm:text-xs h-9 sm:h-7 px-3 sm:px-2">
                      Yesterday
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCheckinDateShortcut('today')} className="text-sm sm:text-xs h-9 sm:h-7 px-3 sm:px-2">
                      Today
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCheckinDateShortcut('tomorrow')} className="text-sm sm:text-xs h-9 sm:h-7 px-3 sm:px-2">
                      Tomorrow
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">From</Label>
                      <Input
                        type="date"
                        value={filters.checkinDateFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, checkinDateFrom: e.target.value }))}
                        className="h-11 sm:h-9 text-sm sm:text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">To</Label>
                      <Input
                        type="date"
                        value={filters.checkinDateTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, checkinDateTo: e.target.value }))}
                        className="h-11 sm:h-9 text-sm sm:text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Expected Check-out Date Range */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Expected Check-out Date Range</Label>
                <div className="space-y-2">
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setExpectedCheckoutDateShortcut('yesterday')} className="text-sm sm:text-xs h-9 sm:h-7 px-3 sm:px-2">
                      Yesterday
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setExpectedCheckoutDateShortcut('today')} className="text-sm sm:text-xs h-9 sm:h-7 px-3 sm:px-2">
                      Today
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setExpectedCheckoutDateShortcut('tomorrow')} className="text-sm sm:text-xs h-9 sm:h-7 px-3 sm:px-2">
                      Tomorrow
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">From</Label>
                      <Input
                        type="date"
                        value={filters.expectedCheckoutDateFrom}
                        onChange={(e) => setFilters(prev => ({ ...prev, expectedCheckoutDateFrom: e.target.value }))}
                        className="h-11 sm:h-9 text-sm sm:text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">To</Label>
                      <Input
                        type="date"
                        value={filters.expectedCheckoutDateTo}
                        onChange={(e) => setFilters(prev => ({ ...prev, expectedCheckoutDateTo: e.target.value }))}
                        className="h-11 sm:h-9 text-sm sm:text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
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

          {/* Clear All */}
          <div className="flex justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
