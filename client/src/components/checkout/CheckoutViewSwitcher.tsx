/**
 * View mode toggle buttons (Card / List / Table) for the checkout page.
 */
import { Button } from "@/components/ui/button";
import { CreditCard, List, Table as TableIcon } from "lucide-react";
import type { ViewMode } from "./checkout-types";

interface CheckoutViewSwitcherProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

export function CheckoutViewSwitcher({ viewMode, setViewMode }: CheckoutViewSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={viewMode === 'card' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('card')}
        className="h-11 sm:h-9 px-3 sm:px-2"
      >
        <CreditCard className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Card</span>
      </Button>
      <Button
        variant={viewMode === 'list' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('list')}
        className="h-11 sm:h-9 px-3 sm:px-2"
      >
        <List className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">List</span>
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setViewMode('table')}
        className="h-11 sm:h-9 px-3 sm:px-2"
      >
        <TableIcon className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">Table</span>
      </Button>
    </div>
  );
}
