/**
 * Table view for the checkout page.
 * Displays guests in a full data table with columns for all details.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserMinus } from "lucide-react";
import { isGuestPaid } from "@/lib/guest";
import { formatDuration, getInitials, getGenderIcon } from "./checkout-utils";
import type { CheckoutViewProps } from "./checkout-types";

export function CheckoutTableView({
  guests,
  today,
  isCondensedView,
  checkoutMutation,
  onCheckout,
}: CheckoutViewProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>Capsule</TableHead>
            <TableHead>Check-in Time</TableHead>
            <TableHead>Duration</TableHead>
            {!isCondensedView && (
              <>
                <TableHead>Expected Checkout</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </>
            )}
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guests.map((guest) => {
            const genderIcon = getGenderIcon(guest.gender || undefined);
            const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
            const isToday = guest.expectedCheckoutDate === today;

            return (
              <TableRow key={guest.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : isToday ? 'bg-orange-50' : ''}`}>
                <TableCell>
                  <div className="flex items-center">
                    <div className={`w-10 h-10 ${genderIcon.bgColor} rounded-full flex items-center justify-center mr-4`}>
                      <span className={`${genderIcon.textColor} font-medium`}>
                        {genderIcon.icon || getInitials(guest.name)}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-hostel-text">{guest.name}</div>
                      <div className="text-sm text-gray-500">ID: #{guest.id.slice(0, 8)}</div>
                      {guest.nationality && (
                        <div className="text-xs text-gray-400">{guest.nationality}</div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                    {guest.capsuleNumber}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-gray-600">
                  {new Date(guest.checkinTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </TableCell>
                <TableCell>
                  <div className="text-sm text-hostel-text font-medium">{formatDuration(guest.checkinTime.toString())}</div>
                  <div className="text-xs text-gray-500">Since check-in</div>
                </TableCell>
                {!isCondensedView && (
                  <>
                    <TableCell className="text-sm text-gray-600">
                      {guest.expectedCheckoutDate ? (
                        <div>
                          <span className={`font-medium ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                            {new Date(guest.expectedCheckoutDate).toLocaleDateString()}
                          </span>
                          {isOverdue && <div className="text-xs text-red-500">Overdue</div>}
                          {isToday && <div className="text-xs text-orange-500">Today</div>}
                        </div>
                      ) : (
                        <span className="text-gray-400">&mdash;</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {guest.paymentAmount ? (
                        <div>
                          <div className="font-medium">RM {guest.paymentAmount}</div>
                          <div className="text-xs text-gray-500">{guest.paymentCollector || 'N/A'}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No payment</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${isGuestPaid(guest) ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
                        <span className="text-xs text-gray-600">{isGuestPaid(guest) ? 'Paid' : 'Unpaid'}</span>
                      </div>
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCheckout(guest.id)}
                    disabled={checkoutMutation.isPending}
                    isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
                    className="text-hostel-error hover:text-red-700 hover:bg-red-50 font-medium h-11 w-11 sm:h-9 sm:w-9 p-0 touch-manipulation"
                    title="Checkout"
                  >
                    <UserMinus className="h-5 w-5 sm:h-4 sm:w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
