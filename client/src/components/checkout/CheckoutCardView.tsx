/**
 * Card view for the checkout page.
 * Full detail cards with guest info, payment, and checkout button.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { isGuestPaid } from "@/lib/guest";
import { formatDuration, getInitials, getGenderIcon } from "./checkout-utils";
import type { CheckoutViewProps } from "./checkout-types";

export function CheckoutCardView({
  guests,
  today,
  checkoutMutation,
  onCheckout,
}: CheckoutViewProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {guests.map((guest) => {
        const genderIcon = getGenderIcon(guest.gender || undefined);
        const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
        const isToday = guest.expectedCheckoutDate === today;

        return (
          <Card key={guest.id} className={`hover:shadow-md transition-shadow ${
            isOverdue ? 'border-red-200 bg-red-50' :
            isToday ? 'border-orange-200 bg-orange-50' : ''
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${genderIcon.bgColor} rounded-full flex items-center justify-center`}>
                    <span className={`${genderIcon.textColor} font-medium`}>
                      {genderIcon.icon || getInitials(guest.name)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{guest.name}</div>
                    <div className="text-xs text-gray-500">ID: #{guest.id.slice(0, 8)}</div>
                  </div>
                </div>
                <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                  {guest.unitNumber}
                </Badge>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-800">Duration:</span>
                  <span className="ml-1">{formatDuration(guest.checkinTime.toString())}</span>
                </div>

                <div className="text-sm">
                  <span className="font-medium text-gray-800">Check-in:</span>
                  <span className="ml-1 text-gray-600">
                    {new Date(guest.checkinTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </span>
                </div>

                {guest.expectedCheckoutDate && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">Expected Out:</span>
                    <span className={`ml-1 ${isOverdue ? 'text-red-600' : isToday ? 'text-orange-600' : 'text-gray-600'}`}>
                      {new Date(guest.expectedCheckoutDate).toLocaleDateString()}
                      {isOverdue && <span className="text-red-500 ml-1">(Overdue)</span>}
                      {isToday && <span className="text-orange-500 ml-1">(Today)</span>}
                    </span>
                  </div>
                )}

                {guest.paymentAmount && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">Payment:</span>
                    <span className="ml-1">RM {guest.paymentAmount}</span>
                    {!isGuestPaid(guest) && <span className="text-red-500 ml-1">(Unpaid)</span>}
                  </div>
                )}

                {guest.nationality && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">Nationality:</span>
                    <span className="ml-1 text-gray-600">{guest.nationality}</span>
                  </div>
                )}
              </div>

              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => onCheckout(guest.id)}
                disabled={checkoutMutation.isPending}
                isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
              >
                <UserMinus className="h-4 w-4 mr-2" />
                {checkoutMutation.isPending && checkoutMutation.variables === guest.id ? "Checking out..." : "Check Out"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
