import { Badge } from "@/components/ui/badge";
import { getStatusConfig } from "./reservation-constants";

interface Props {
  status: string;
}

export function ReservationStatusBadge({ status }: Props) {
  const config = getStatusConfig(status);
  return (
    <Badge variant="outline" className={`${config.color} font-medium`}>
      {config.label}
    </Badge>
  );
}
