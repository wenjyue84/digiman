import type { Reservation } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, XCircle, UserCheck, Trash2 } from "lucide-react";
import { ReservationStatusBadge } from "./ReservationStatusBadge";
import { getSourceLabel } from "./reservation-constants";

interface Props {
  reservations: Reservation[];
  isLoading: boolean;
  onEdit: (r: Reservation) => void;
  onCancel: (id: string) => void;
  onConvert: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ReservationTable({ reservations, isLoading, onEdit, onCancel, onConvert, onDelete }: Props) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading reservations...</div>;
  }

  if (reservations.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No reservations found</div>;
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Confirmation</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead className="hidden md:table-cell">Unit</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead className="hidden sm:table-cell">Check-out</TableHead>
            <TableHead className="hidden lg:table-cell">Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reservations.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.confirmationNumber}</TableCell>
              <TableCell>
                <div className="font-medium">{r.guestName}</div>
                {r.guestPhone && <div className="text-xs text-muted-foreground">{r.guestPhone}</div>}
              </TableCell>
              <TableCell className="hidden md:table-cell">{r.unitNumber || "Any"}</TableCell>
              <TableCell>{r.checkInDate}</TableCell>
              <TableCell className="hidden sm:table-cell">{r.checkOutDate}</TableCell>
              <TableCell className="hidden lg:table-cell">{getSourceLabel(r.source)}</TableCell>
              <TableCell><ReservationStatusBadge status={r.status} /></TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(r)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    {(r.status === "confirmed" || r.status === "pending") && (
                      <DropdownMenuItem onClick={() => onConvert(r.id)}>
                        <UserCheck className="mr-2 h-4 w-4" /> Check In
                      </DropdownMenuItem>
                    )}
                    {r.status !== "cancelled" && r.status !== "checked_in" && (
                      <DropdownMenuItem onClick={() => onCancel(r.id)} className="text-orange-600">
                        <XCircle className="mr-2 h-4 w-4" /> Cancel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(r.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
