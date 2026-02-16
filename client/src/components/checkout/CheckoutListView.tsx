/**
 * List view for the checkout page.
 * Compact row layout showing essential guest info with checkout action.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserMinus } from "lucide-react";
import { formatDuration, getInitials, getGenderIcon } from "./checkout-utils";
import type { CheckoutViewProps } from "./checkout-types";

export function CheckoutListView({
  guests,
  today,
  isCondensedView,
  checkoutMutation,
  onCheckout,
}: CheckoutViewProps) {
  return (
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {guests.map((guest) => {
        const genderIcon = getGenderIcon(guest.gender || undefined);
        const isOverdue = guest.expectedCheckoutDate && guest.expectedCheckoutDate < today;
        const isToday = guest.expectedCheckoutDate === today;

        return (
          <div key={guest.id} className={`flex items-center justify-between rounded-md border px-3 py-2 ${
            isOverdue ? 'border-red-200 bg-red-50' :
            isToday ? 'border-orange-200 bg-orange-50' :
            'border-gray-200 bg-white'
          }`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-8 h-8 ${genderIcon.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className={`${genderIcon.textColor} text-xs font-medium`}>
                  {genderIcon.icon || getInitials(guest.name)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge className={`${isOverdue ? 'bg-red-600' : isToday ? 'bg-orange-600' : 'bg-blue-600'} text-white text-xs`}>
                    {guest.capsuleNumber}
                  </Badge>
                  <span className="font-medium text-sm truncate">{guest.name}</span>
                </div>
                <div className="text-xs text-gray-600">
                  {formatDuration(guest.checkinTime.toString())}
                  {!isCondensedView && guest.paymentAmount && (
                    <span className="ml-2">&bull; RM {guest.paymentAmount}</span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCheckout(guest.id)}
              disabled={checkoutMutation.isPending}
              className="text-hostel-error hover:text-red-700 hover:bg-red-50 ml-2 h-11 w-11 sm:h-9 sm:w-9 p-0 touch-manipulation"
              title="Checkout"
            >
              <UserMinus className="h-5 w-5 sm:h-4 sm:w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
