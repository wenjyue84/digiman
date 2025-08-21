import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Filter as FilterIcon, X, Calendar, User, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface MaintenanceFilters {
  dateFrom: string;
  dateTo: string;
  capsuleNumber: string;
  reportedBy: string;
  showResolved: boolean;
}

interface MaintenanceFiltersProps {
  filters: MaintenanceFilters;
  onFiltersChange: (filters: MaintenanceFilters) => void;
  capsules: Array<{ number: string; section: string }>;
  reporters: string[];
  className?: string;
}

export function MaintenanceFilters({ 
  filters, 
  onFiltersChange, 
  capsules, 
  reporters, 
  className = '' 
}: MaintenanceFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.capsuleNumber || filters.reportedBy || filters.showResolved;

  const clearFilters = () => {
    onFiltersChange({
      dateFrom: '',
      dateTo: '',
      capsuleNumber: '',
      reportedBy: '',
      showResolved: false,
    });
  };

  const updateFilter = (key: keyof MaintenanceFilters, value: string | boolean) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.capsuleNumber) count++;
    if (filters.reportedBy) count++;
    if (filters.showResolved) count++;
    return count;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <FilterIcon className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {getActiveFilterCount()}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filter Maintenance Issues</h4>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Date Range Filters */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Date Range
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date-from" className="text-xs text-gray-600">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="date-to" className="text-xs text-gray-600">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Capsule Filter */}
          <div className="space-y-2">
            <Label htmlFor="capsule-filter" className="text-xs font-medium flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Capsule
            </Label>
            <Select value={filters.capsuleNumber} onValueChange={(value) => updateFilter('capsuleNumber', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All capsules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All capsules</SelectItem>
                {capsules.map((capsule) => (
                  <SelectItem key={capsule.number} value={capsule.number}>
                    {capsule.number} - {capsule.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reported By Filter */}
          <div className="space-y-2">
            <Label htmlFor="reporter-filter" className="text-xs font-medium flex items-center gap-1">
              <User className="h-3 w-3" />
              Reported By
            </Label>
            <Select value={filters.reportedBy} onValueChange={(value) => updateFilter('reportedBy', value)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All reporters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All reporters</SelectItem>
                {reporters.map((reporter) => (
                  <SelectItem key={reporter} value={reporter}>
                    {reporter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Show Resolved Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-resolved" className="text-xs font-medium">
              Show Resolved Issues
            </Label>
            <input
              id="show-resolved"
              type="checkbox"
              checked={filters.showResolved}
              onChange={(e) => updateFilter('showResolved', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="pt-2 border-t">
              <div className="text-xs text-gray-600 mb-2">Active Filters:</div>
              <div className="flex flex-wrap gap-1">
                {filters.dateFrom && (
                  <Badge variant="outline" className="text-xs">
                    From: {new Date(filters.dateFrom).toLocaleDateString()}
                  </Badge>
                )}
                {filters.dateTo && (
                  <Badge variant="outline" className="text-xs">
                    To: {new Date(filters.dateTo).toLocaleDateString()}
                  </Badge>
                )}
                {filters.capsuleNumber && (
                  <Badge variant="outline" className="text-xs">
                    Capsule: {filters.capsuleNumber}
                  </Badge>
                )}
                {filters.reportedBy && (
                  <Badge variant="outline" className="text-xs">
                    By: {filters.reportedBy}
                  </Badge>
                )}
                {filters.showResolved && (
                  <Badge variant="outline" className="text-xs">
                    Show Resolved
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


