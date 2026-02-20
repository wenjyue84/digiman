import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, Phone, Bell } from "lucide-react";
import type { Guest } from "@shared/schema";
import { isGuestPaid } from "@/lib/guest";
import { phoneUtils } from "@/lib/validation";
import { SwipeableGuestCard } from "./SwipeableGuestCard";
import { UnitSelector } from "./UnitSelector";
import { truncateName, formatShortDate } from "./utils";
import { compareUnitNumbers } from "./useGuestSorting";
import { getGuestStatusInfo } from "./GuestTableRow";
import type { CombinedDataItem, AvailableUnit } from "./types";

interface GuestCardViewProps {
  sortedData: CombinedDataItem[];
  isCondensedView: boolean;
  isAuthenticated: boolean;
  availableUnits: AvailableUnit[];
  activeTokens: Array<{
    id: string;
    token: string;
    unitNumber: string;
    guestName: string | null;
    phoneNumber: string | null;
    createdAt: string;
    expiresAt: string;
  }>;
  // Mutations
  checkoutGuest: Guest | null;
  cancelTokenMutation: any;
  updateTokenUnitMutation: any;
  // Handlers
  onCheckout: (guestId: string) => void;
  onGuestClick: (guest: Guest) => void;
  onExtend: (guest: Guest) => void;
  openAlertDialog: (guest: Guest) => void;
  onUnitChange: (guest: Guest, newUnitNumber: string) => void;
  onTokenUnitChange: (tokenId: string, unitNumber: string | null, autoAssign?: boolean) => void;
  onPendingCheckinClick: (tokenId: string) => void;
  onEmptyUnitClick: (unitNumber: string) => void;
}

export function GuestCardView({
  sortedData,
  isCondensedView,
  isAuthenticated,
  availableUnits,
  activeTokens,
  checkoutGuest,
  cancelTokenMutation,
  updateTokenUnitMutation,
  onCheckout,
  onGuestClick,
  onExtend,
  openAlertDialog,
  onUnitChange,
  onTokenUnitChange,
  onPendingCheckinClick,
  onEmptyUnitClick,
}: GuestCardViewProps) {
  return (
    <div className="md:hidden space-y-3">
      {sortedData.map((item) => {
        if (item.type === 'guest') {
          return (
            <GuestCard
              key={`guest-${item.data.id}`}
              guest={item.data}
              isCondensedView={isCondensedView}
              isAuthenticated={isAuthenticated}
              availableUnits={availableUnits}
              checkoutGuest={checkoutGuest}
              onCheckout={onCheckout}
              onGuestClick={onGuestClick}
              onExtend={onExtend}
              openAlertDialog={openAlertDialog}
              onUnitChange={onUnitChange}
            />
          );
        } else if (item.type === 'pending') {
          return (
            <PendingCard
              key={`pending-${item.data.id}`}
              pendingData={item.data}
              isCondensedView={isCondensedView}
              isAuthenticated={isAuthenticated}
              availableUnits={availableUnits}
              cancelTokenMutation={cancelTokenMutation}
              updateTokenUnitMutation={updateTokenUnitMutation}
              onTokenUnitChange={onTokenUnitChange}
              onPendingCheckinClick={onPendingCheckinClick}
            />
          );
        } else if (item.type === 'empty') {
          return (
            <EmptyUnitCard
              key={`empty-${item.data.id}`}
              emptyData={item.data}
              isCondensedView={isCondensedView}
              onEmptyUnitClick={onEmptyUnitClick}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

// ---------- Guest Card ----------

interface GuestCardProps {
  guest: Guest;
  isCondensedView: boolean;
  isAuthenticated: boolean;
  availableUnits: AvailableUnit[];
  checkoutGuest: Guest | null;
  onCheckout: (guestId: string) => void;
  onGuestClick: (guest: Guest) => void;
  onExtend: (guest: Guest) => void;
  openAlertDialog: (guest: Guest) => void;
  onUnitChange: (guest: Guest, newUnitNumber: string) => void;
}

function GuestCard({
  guest,
  isCondensedView,
  isAuthenticated,
  availableUnits,
  checkoutGuest,
  onCheckout,
  onGuestClick,
  onExtend,
  openAlertDialog,
  onUnitChange,
}: GuestCardProps) {
  const isGuestCheckingOut = checkoutGuest?.id === guest.id;
  const statusInfo = getGuestStatusInfo(guest);

  return (
    <Card className="p-0 overflow-hidden hover-card-pop">
      <SwipeableGuestCard
        guest={guest}
        onCheckout={onCheckout}
        onExtend={onExtend}
        isCheckingOut={isGuestCheckingOut}
      >
        <div className="p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <UnitSelector
                guest={guest}
                isAuthenticated={isAuthenticated}
                availableUnits={availableUnits}
                onUnitChange={onUnitChange}
              />
              <button
                onClick={() => onGuestClick(guest)}
                className={`font-medium hover:underline focus:outline-none ${!isGuestPaid(guest) ? 'text-red-600' : ''}`}
              >
                {truncateName(guest.name)}
              </button>
              {statusInfo && <span title={statusInfo.label}>{statusInfo.icon}</span>}
            </div>
            <div className="text-xs text-gray-600 mt-1 flex items-center gap-2">
              <span>In: {formatShortDate(guest.checkinTime.toString())}</span>
              {guest.expectedCheckoutDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openAlertDialog(guest);
                  }}
                  className="group flex items-center gap-1 hover:bg-gray-100 rounded px-1 -mx-1 transition-colors"
                  title="Set checkout reminder"
                >
                  <span>Out: {formatShortDate(guest.expectedCheckoutDate)}</span>
                  <Bell className="h-3 w-3 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </button>
              )}
            </div>
            {!isCondensedView && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-gray-700">
                <div>
                  <span className="font-medium text-gray-800">Nationality:</span> {guest.nationality || '\u2014'}
                </div>
                <div>
                  <span className="font-medium text-gray-800">Phone:</span> {guest.phoneNumber || '\u2014'}
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-800">Payment:</span>
                  <span className={isGuestPaid(guest) ? '' : 'text-red-600 font-semibold'}>RM {guest.paymentAmount}</span>
                  {guest.paymentMethod && <span>* {guest.paymentMethod.toUpperCase()}</span>}
                  <Badge variant={isGuestPaid(guest) ? 'default' : 'destructive'}>{isGuestPaid(guest) ? 'Paid' : 'Outstanding'}</Badge>
                </div>
                {guest.paymentCollector && (
                  <div className="col-span-2">
                    <span className="font-medium text-gray-800">Collected by:</span> {guest.paymentCollector}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Status Display in Center */}
          <div className="flex flex-col items-center justify-center px-2">
            {isGuestPaid(guest) ? (
              <div className="flex items-center text-green-600">
                <span className="text-lg">{'\u2713'}</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <span className="text-lg">{'\u2717'}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {guest.phoneNumber && (
              phoneUtils.isCallable(guest.phoneNumber) ? (
                <Button
                  variant="secondary"
                  className="h-11 w-11 rounded-full"
                  asChild
                  title={`Call ${guest.phoneNumber}`}
                >
                  <a href={phoneUtils.getTelHref(guest.phoneNumber)!}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="h-11 w-11 rounded-full opacity-50"
                  disabled
                  title={guest.phoneNumber}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )
            )}
            <Button
              variant="destructive"
              className="h-11 w-11 rounded-full"
              onClick={() => onCheckout(guest.id)}
              disabled={isGuestCheckingOut}
              title="Checkout"
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SwipeableGuestCard>
    </Card>
  );
}

// ---------- Pending Card ----------

interface PendingCardProps {
  pendingData: any;
  isCondensedView: boolean;
  isAuthenticated: boolean;
  availableUnits: AvailableUnit[];
  cancelTokenMutation: any;
  updateTokenUnitMutation: any;
  onTokenUnitChange: (tokenId: string, unitNumber: string | null, autoAssign?: boolean) => void;
  onPendingCheckinClick: (tokenId: string) => void;
}

function PendingCard({
  pendingData,
  isCondensedView,
  isAuthenticated,
  availableUnits,
  cancelTokenMutation,
  updateTokenUnitMutation,
  onTokenUnitChange,
  onPendingCheckinClick,
}: PendingCardProps) {
  return (
    <Card className="p-3 bg-orange-50/60 hover-card-pop">
      <div className="flex items-center justify-between gap-3">
        <div>
          <button
            onClick={() => onPendingCheckinClick(pendingData.id)}
            className="flex items-center gap-2 focus:outline-none"
          >
            {isAuthenticated ? (
              <Select
                value={pendingData.unitNumber || 'auto-assign'}
                onValueChange={(value) => {
                  if (value === 'auto-assign') {
                    onTokenUnitChange(pendingData.id, null, true);
                  } else {
                    onTokenUnitChange(pendingData.id, value);
                  }
                }}
                disabled={updateTokenUnitMutation.isPending}
              >
                <SelectTrigger className="w-24 h-6 text-xs bg-orange-500 text-white border-orange-500 hover:bg-orange-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-assign" className="text-xs">
                    <span className="font-medium">Auto-assign</span>
                  </SelectItem>
                  {availableUnits
                    .sort((a, b) => compareUnitNumbers(a.number, b.number))
                    .map((unit) => (
                      <SelectItem key={unit.number} value={unit.number} className="text-xs">
                        <div className="flex items-center justify-between w-full">
                          <span>{unit.number}</span>
                          {unit.position === 'bottom' && <span title="Bottom bed">*</span>}
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="bg-orange-500 text-white border-orange-500">
                {pendingData.unitNumber || 'Auto-assign'}
              </Badge>
            )}
            <span className="font-medium cursor-pointer underline-offset-2 hover:underline">{truncateName(pendingData.name)}</span>
          </button>
          <div className="text-xs text-orange-700 mt-1">
            In: {formatShortDate(pendingData.createdAt)}
            <span className="ml-2">Expires: {formatShortDate(pendingData.expiresAt)}</span>
          </div>
          {!isCondensedView && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-orange-700">
              <div className="col-span-2">
                <span className="font-medium">Status:</span> Awaiting self check-in
              </div>
              {pendingData.phoneNumber && (
                <div className="col-span-2">
                  <span className="font-medium">Phone:</span> {pendingData.phoneNumber}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 px-4 rounded-full"
            onClick={() => cancelTokenMutation.mutate(pendingData.id)}
            disabled={cancelTokenMutation.isPending}
          >
            {cancelTokenMutation.isPending ? 'Cancelling...' : 'Cancel'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Empty Card ----------

interface EmptyUnitCardProps {
  emptyData: any;
  isCondensedView: boolean;
  onEmptyUnitClick: (unitNumber: string) => void;
}

function EmptyUnitCard({ emptyData, isCondensedView, onEmptyUnitClick }: EmptyUnitCardProps) {
  return (
    <Card
      className="p-3 bg-red-50/60 hover-card-pop cursor-pointer"
      onClick={() => onEmptyUnitClick(emptyData.unitNumber)}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-red-600 text-white border-red-600">{emptyData.unitNumber}</Badge>
            <span className="font-medium text-red-700">Empty</span>
          </div>
          <div className="text-xs text-red-700 mt-1">
            Status: Available
          </div>
          {!isCondensedView && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-red-700">
              <div className="col-span-2">
                <span className="font-medium">Section:</span> {emptyData.section}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Cleaning:</span> {emptyData.cleaningStatus}
              </div>
              {emptyData.remark && (
                <div className="col-span-2">
                  <span className="font-medium">Note:</span> {emptyData.remark}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600">Empty</span>
        </div>
      </div>
    </Card>
  );
}
