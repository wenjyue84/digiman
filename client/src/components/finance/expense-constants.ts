import { z } from "zod";

// Expense schema
export const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  category: z.enum(["salary", "utilities", "consumables", "maintenance", "equipment", "marketing", "operations", "other"]),
  subcategory: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  receiptPhotoUrl: z.string().optional(),
  itemPhotoUrl: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

export const expenseCategories = {
  salary: {
    label: "Salary & Wages",
    color: "bg-indigo-100 text-indigo-800",
    subcategories: ["Staff Salary", "Part-time Staff", "Overtime Pay", "EPF Contribution", "SOCSO", "Bonuses"]
  },
  utilities: {
    label: "Utilities",
    color: "bg-green-100 text-green-800",
    subcategories: ["SAJ (Water Bill)", "TNB (Electricity)", "Internet/WiFi", "Gas", "Waste Management", "Sewerage"]
  },
  consumables: {
    label: "Consumables",
    color: "bg-blue-100 text-blue-800",
    subcategories: ["Toilet Paper", "Shower Gel", "Shampoo", "Towels", "Bed Sheets", "Pillowcases", "Cleaning Supplies", "Detergent", "Disinfectant", "Air Freshener"]
  },
  maintenance: {
    label: "Maintenance & Repairs",
    color: "bg-red-100 text-red-800",
    subcategories: ["Plumbing Repair", "Electrical Repair", "AC Servicing", "Painting", "Pest Control", "Lock & Key Repair", "Furniture Repair", "Appliance Repair"]
  },
  equipment: {
    label: "Equipment & Furniture",
    color: "bg-purple-100 text-purple-800",
    subcategories: ["Capsule Beds", "Mattresses", "Lockers", "Curtains", "Lighting", "Fans", "Security Cameras", "WiFi Equipment"]
  },
  marketing: {
    label: "Marketing & Promotion",
    color: "bg-pink-100 text-pink-800",
    subcategories: ["Online Advertising", "Photography", "Website Maintenance", "Social Media Ads", "Booking Platform Commission", "Print Materials"]
  },
  operations: {
    label: "Daily Operations",
    color: "bg-yellow-100 text-yellow-800",
    subcategories: ["Laundry Service", "Reception Supplies", "Key Cards", "Stationery", "Printer Ink", "Cash Float", "Petty Cash"]
  },
  other: {
    label: "Other Expenses",
    color: "bg-gray-100 text-gray-800",
    subcategories: ["Insurance", "Legal Fees", "Accounting", "Banking Charges", "License Renewal", "Government Fees", "Miscellaneous"]
  }
} as const;

export type ExpenseCategoryKey = keyof typeof expenseCategories;

/** Safely parse an amount value that may be string or number */
export const parseAmount = (amount: any): number => {
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string') return parseFloat(amount) || 0;
  return 0;
};

export const DEFAULT_FORM_VALUES: ExpenseFormData = {
  description: "Spending",
  amount: "0",
  category: "other",
  subcategory: "",
  date: new Date().toISOString().split('T')[0],
  notes: "",
  receiptPhotoUrl: "",
  itemPhotoUrl: "",
};
