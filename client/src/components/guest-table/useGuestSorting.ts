import { useMemo, useState } from "react";
import type { CombinedDataItem, SortConfig, SortField } from "./types";

// Helper for natural unit sorting: first by prefix (C, J, R), then by number (1, 2, ..., 10, 11)
export const parseUnitNumber = (value: string | null | undefined) => {
  if (!value) return { prefix: "ZZZ", num: 999999 };
  const match = value.match(/^([A-Za-z]+)(\d+)$/);
  if (match) {
    return { prefix: match[1].toUpperCase(), num: parseInt(match[2], 10) };
  }
  return { prefix: value.toUpperCase(), num: 0 };
};

export const compareUnitNumbers = (
  a: string | null | undefined,
  b: string | null | undefined
): number => {
  const aParsed = parseUnitNumber(a);
  const bParsed = parseUnitNumber(b);

  if (aParsed.prefix !== bParsed.prefix) {
    return aParsed.prefix.localeCompare(bParsed.prefix);
  }
  return aParsed.num - bParsed.num;
};

/** @deprecated Use parseUnitNumber */
export const parseCapsuleNumber = parseUnitNumber;
/** @deprecated Use compareUnitNumbers */
export const compareCapsuleNumbers = compareUnitNumbers;

export function useGuestSorting(filteredData: CombinedDataItem[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "unitNumber",
    order: "asc",
  });

  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];

    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case "name":
          aValue = a.data.name.toLowerCase();
          bValue = b.data.name.toLowerCase();
          break;
        case "unitNumber": {
          const aUnit = a.data.unitNumber;
          const bUnit = b.data.unitNumber;
          const unitCompare = compareUnitNumbers(aUnit, bUnit);
          return sortConfig.order === "asc" ? unitCompare : -unitCompare;
        }
        case "checkinTime":
          aValue =
            a.type === "guest"
              ? new Date(a.data.checkinTime).getTime()
              : new Date((a.data as any).createdAt).getTime();
          bValue =
            b.type === "guest"
              ? new Date(b.data.checkinTime).getTime()
              : new Date((b.data as any).createdAt).getTime();
          break;
        case "expectedCheckoutDate":
          aValue =
            a.type === "guest"
              ? a.data.expectedCheckoutDate
                ? new Date(a.data.expectedCheckoutDate).getTime()
                : 0
              : new Date((a.data as any).expiresAt).getTime();
          bValue =
            b.type === "guest"
              ? b.data.expectedCheckoutDate
                ? new Date(b.data.expectedCheckoutDate).getTime()
                : 0
              : new Date((b.data as any).expiresAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.order === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.order === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  };

  return { sortConfig, sortedData, handleSort };
}
