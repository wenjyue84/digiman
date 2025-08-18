import { useQuery } from "@tanstack/react-query";

type AccommodationType = "capsule" | "room" | "house";

function computeLabels(type: AccommodationType | undefined) {
  const t = type || "capsule";
  const singular = t === "capsule" ? "Capsule" : t === "room" ? "Room" : "House";
  const plural = t === "capsule" ? "Capsules" : t === "room" ? "Rooms" : "Houses";
  const lowerSingular = singular.toLowerCase();
  const lowerPlural = plural.toLowerCase();
  return {
    type: t,
    singular,
    plural,
    lowerSingular,
    lowerPlural,
    numberLabel: `${singular} Number`,
    maintenanceTitle: `${singular} Maintenance`,
  };
}

export function useAccommodationLabels() {
  const { data } = useQuery<{ guestTokenExpirationHours: number; accommodationType?: AccommodationType }>({
    queryKey: ["/api/settings"],
  });
  return computeLabels(data?.accommodationType);
}


