import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortField = 'name' | 'capsuleNumber' | 'checkinTime' | 'expectedCheckoutDate';
type SortOrder = 'asc' | 'desc';

interface SortButtonProps {
  field: SortField;
  currentSort: { field: SortField; order: SortOrder };
  onSort: (field: SortField) => void;
}

export function SortButton({ field, currentSort, onSort }: SortButtonProps) {
  const isActive = currentSort.field === field;
  
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-gray-700 transition-colors"
    >
      {isActive ? (
        currentSort.order === 'asc' ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}