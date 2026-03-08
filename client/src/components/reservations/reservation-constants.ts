export const RESERVATION_STATUSES = [
  { value: "confirmed", label: "Confirmed", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "pending", label: "Pending", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "checked_in", label: "Checked In", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "no_show", label: "No Show", color: "bg-gray-100 text-gray-800 border-gray-200" },
  { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-500 border-gray-200" },
] as const;

export const RESERVATION_SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "booking_com", label: "Booking.com" },
  { value: "airbnb", label: "Airbnb" },
  { value: "agoda", label: "Agoda" },
  { value: "other", label: "Other" },
] as const;

export const DEPOSIT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "tng", label: "Touch 'n Go" },
  { value: "bank", label: "Bank Transfer" },
  { value: "platform", label: "Platform (OTA)" },
  { value: "other", label: "Other" },
] as const;

export function getStatusConfig(status: string) {
  return RESERVATION_STATUSES.find(s => s.value === status) ?? RESERVATION_STATUSES[0];
}

export function getSourceLabel(source: string) {
  return RESERVATION_SOURCES.find(s => s.value === source)?.label ?? source;
}
