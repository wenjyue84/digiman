import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ArrowUpDown, X } from "lucide-react";
import { expenseCategories, type ExpenseCategoryKey } from "./expense-constants";

interface ExpenseDateFilterProps {
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  dateFilter: string;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  setDateFilter: (value: string) => void;
  setDateRange: (range: string) => void;
  amountMin: string;
  setAmountMin: (value: string) => void;
  amountMax: string;
  setAmountMax: (value: string) => void;
  sortBy: "date" | "amount" | "";
  setSortBy: (value: "date" | "amount" | "") => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (value: "asc" | "desc") => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

export function ExpenseDateFilter({
  selectedCategory,
  setSelectedCategory,
  dateFilter,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  setDateFilter,
  setDateRange,
  amountMin,
  setAmountMin,
  amountMax,
  setAmountMax,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  clearAllFilters,
  hasActiveFilters,
}: ExpenseDateFilterProps) {
  return (
    <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="h-4 w-4" />
        <span className="font-medium">Filters & Sorting</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="ml-auto text-xs"
        >
          <X className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      </div>

      {/* First Row: Category and Date Range Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(expenseCategories).map(([key, cat]) => (
                <SelectItem key={key} value={key}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Quick Date Range</Label>
          <Select value={dateFilter} onValueChange={(value) => {
            if (value === "all") {
              setDateFrom("");
              setDateTo("");
              setDateFilter("all");
            } else {
              setDateRange(value);
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-7-days">Last 7 Days</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">Sort By</Label>
          <div className="flex gap-2">
            <Select value={sortBy || "none"} onValueChange={(value: "date" | "amount" | "none") => setSortBy(value === "none" ? "" : value)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="No Sorting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Sorting</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
            {sortBy && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="px-3"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortOrder === "asc" ? "\u2191" : "\u2193"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Second Row: Custom Date Range and Amount Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label className="text-sm font-medium">Custom Date Range</Label>
          <div className="flex gap-2 mt-1">
            <div className="flex-1">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDateFilter("custom");
                }}
                placeholder="From date"
              />
            </div>
            <span className="self-center text-gray-500">to</span>
            <div className="flex-1">
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDateFilter("custom");
                }}
                placeholder="To date"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Amount Range (RM)</Label>
          <div className="flex gap-2 mt-1">
            <Input
              type="number"
              value={amountMin}
              onChange={(e) => setAmountMin(e.target.value)}
              placeholder="Min amount"
              step="0.01"
            />
            <span className="self-center text-gray-500">to</span>
            <Input
              type="number"
              value={amountMax}
              onChange={(e) => setAmountMax(e.target.value)}
              placeholder="Max amount"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <span className="text-xs text-gray-600">Active filters:</span>
          {selectedCategory !== "all" && (
            <Badge variant="secondary" className="text-xs">
              Category: {expenseCategories[selectedCategory as ExpenseCategoryKey]?.label}
            </Badge>
          )}
          {dateFrom && (
            <Badge variant="secondary" className="text-xs">
              From: {dateFrom}
            </Badge>
          )}
          {dateTo && (
            <Badge variant="secondary" className="text-xs">
              To: {dateTo}
            </Badge>
          )}
          {amountMin && (
            <Badge variant="secondary" className="text-xs">
              Min: RM{amountMin}
            </Badge>
          )}
          {amountMax && (
            <Badge variant="secondary" className="text-xs">
              Max: RM{amountMax}
            </Badge>
          )}
          {sortBy && (
            <Badge variant="secondary" className="text-xs">
              Sort: {sortBy} ({sortOrder === "asc" ? "\u2191" : "\u2193"})
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
