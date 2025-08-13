export type Holiday = {
  date: string; // YYYY-MM-DD
  name: string;
  isPublicHoliday: boolean; // true for national/state PH; false for notable festivals
  scope?: "national" | "johor" | "festival";
};

// Curated 2025 dates. Adjust if official announcements differ.
// Includes major national public holidays and notable cultural festivals that guests may care about.
export const HOLIDAYS_2025: Holiday[] = [
  // National public holidays
  { date: "2025-01-01", name: "New Year's Day", isPublicHoliday: true, scope: "national" },
  { date: "2025-05-01", name: "Labour Day", isPublicHoliday: true, scope: "national" },
  { date: "2025-08-31", name: "National Day (Hari Merdeka)", isPublicHoliday: true, scope: "national" },
  { date: "2025-09-16", name: "Malaysia Day", isPublicHoliday: true, scope: "national" },
  { date: "2025-12-25", name: "Christmas Day", isPublicHoliday: true, scope: "national" },

  // Chinese New Year (widely observed; public holiday in MY)
  { date: "2025-01-29", name: "Chinese New Year (Day 1)", isPublicHoliday: true, scope: "national" },
  { date: "2025-01-30", name: "Chinese New Year (Day 2)", isPublicHoliday: true, scope: "national" },

  // Hari Raya Aidilfitri (dates based on published lunar estimates; subject to official announcement)
  { date: "2025-03-31", name: "Hari Raya Aidilfitri (Day 1)", isPublicHoliday: true, scope: "national" },
  { date: "2025-04-01", name: "Hari Raya Aidilfitri (Day 2)", isPublicHoliday: true, scope: "national" },

  // Wesak Day (Buddhist) – commonly observed nationally (date may vary by announcement)
  { date: "2025-05-12", name: "Wesak Day", isPublicHoliday: true, scope: "national" },

  // Notable cultural festivals (not always official public holidays but useful to surface)
  { date: "2025-05-31", name: "Dragon Boat Festival", isPublicHoliday: false, scope: "festival" },
  { date: "2025-10-06", name: "Mid‑Autumn (Mooncake) Festival", isPublicHoliday: false, scope: "festival" },
];

// Basic lookup for a YYYY-MM-DD date string
export function getHolidaysForDate(dateStr?: string): Holiday[] {
  if (!dateStr) return [];
  return HOLIDAYS_2025.filter((h) => h.date === dateStr);
}

export function hasPublicHoliday(dateStr?: string): boolean {
  return getHolidaysForDate(dateStr).some((h) => h.isPublicHoliday);
}

export function getHolidayLabel(dateStr?: string): string | null {
  const matches = getHolidaysForDate(dateStr);
  if (matches.length === 0) return null;
  // Prioritize public holiday label; otherwise festival label
  const primary = matches.find((h) => h.isPublicHoliday) || matches[0];
  if (matches.length === 1) return primary.name;
  const others = matches.filter((h) => h !== primary).map((h) => h.name);
  return `${primary.name}${others.length ? ` (+${others.length} more)` : ""}`;
}

export type MonthHolidays = {
  date: string;
  holidays: Holiday[];
};

const monthHolidayCache = new Map<string, MonthHolidays[]>();

export async function getMonthHolidays(
  year: number,
  month: number,
): Promise<MonthHolidays[]> {
  const key = `${year}-${month}`;
  if (monthHolidayCache.has(key)) {
    return monthHolidayCache.get(key)!;
  }

  const grouped: Record<string, Holiday[]> = {};
  for (const holiday of HOLIDAYS_2025) {
    const date = new Date(holiday.date);
    if (date.getFullYear() === year && date.getMonth() === month) {
      if (!grouped[holiday.date]) {
        grouped[holiday.date] = [];
      }
      grouped[holiday.date].push(holiday);
    }
  }

  const result = Object.entries(grouped).map(([date, holidays]) => ({
    date,
    holidays,
  }));

  monthHolidayCache.set(key, result);
  return result;
}