import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserMinus, CalendarPlus, Copy, Bell, AlertCircle, Clock, Ban, Star } from "lucide-react";
import type { Guest } from "@shared/schema";
import { isGuestPaid, getGuestBalance } from "@/lib/guest";
import { SwipeableGuestRow } from "./SwipeableGuestRow";
import { UnitSelector } from "./UnitSelector";
import { SortButton } from "./SortButton";
import {
  getInitials,
  truncateName,
  getFirstInitial,
  getGenderIcon,
  formatShortDateTime,
  formatShortDate,
} from "./utils";
import { compareUnitNumbers } from "./useGuestSorting";
import type { SortConfig, SortField, CombinedDataItem, AvailableUnit } from "./types";
import { useAccommodationLabels } from "@/hooks/useAccommodationLabels";

// ---------- Helpers ----------

export function calculatePlannedStayDays(checkinTime: string | Date, expectedCheckoutDate?: string | Date | null): number {
  try {
    if (!expectedCheckoutDate) return 0;
    const checkin = new Date(checkinTime);
    const plannedCheckout = new Date(expectedCheckoutDate);
    const diffMs = plannedCheckout.getTime() - checkin.getTime();
    if (Number.isNaN(diffMs)) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function extractOutstandingAmount(guest: Guest): string | null {
  if (isGuestPaid(guest)) return null;
  const balance = getGuestBalance(guest);
  if (balance > 0) {
    return `RM${balance.toFixed(2)}`;
  }
  return null;
}

export function getGuestStatusInfo(guest: Guest) {
  if (guest.status === 'blacklisted') {
    return {
      label: 'Blacklisted',
      icon: <Ban className="h-4 w-4 text-red-600" />,
      variant: 'destructive' as const,
    };
  }
  if (guest.status === 'vip') {
    return {
      label: 'VIP',
      icon: <Star className="h-4 w-4 text-yellow-500" />,
      variant: 'default' as const,
      className: 'bg-yellow-500 text-black',
    };
  }
  const today = new Date();
  const checkout = guest.expectedCheckoutDate ? new Date(guest.expectedCheckoutDate) : null;
  if (checkout && checkout < new Date(today.toDateString())) {
    return {
      label: 'Overdue',
      icon: <Clock className="h-4 w-4 text-red-600" />,
      variant: 'destructive' as const,
    };
  }
  if (!isGuestPaid(guest)) {
    return {
      label: 'Outstanding',
      icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
      variant: 'destructive' as const,
    };
  }
  return null;
}

// ---------- Desktop Table ----------

interface GuestDesktopTableProps {
  sortedData: CombinedDataItem[];
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  isCondensedView: boolean;
  isMobile: boolean;
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
  checkoutMutation: any;
  cancelTokenMutation: any;
  updateTokenUnitMutation: any;
  // Handlers
  onCheckout: (guestId: string) => void;
  onGuestClick: (guest: Guest) => void;
  onExtend: (guest: Guest) => void;
  openAlertDialog: (guest: Guest) => void;
  onUnitChange: (guest: Guest, newUnitNumber: string) => void;
  onCancelToken: (tokenId: string) => void;
  onTokenUnitChange: (tokenId: string, unitNumber: string | null, autoAssign?: boolean) => void;
  copyToClipboard: (text: string) => void;
  getCheckinLink: (token: string) => string;
  onEmptyUnitClick: (unitNumber: string) => void;
}

export function GuestDesktopTable({
  sortedData,
  sortConfig,
  onSort,
  isCondensedView,
  isMobile,
  isAuthenticated,
  availableUnits,
  activeTokens,
  checkoutMutation,
  cancelTokenMutation,
  updateTokenUnitMutation,
  onCheckout,
  onGuestClick,
  onExtend,
  openAlertDialog,
  onUnitChange,
  onCancelToken,
  onTokenUnitChange,
  copyToClipboard,
  getCheckinLink,
  onEmptyUnitClick,
}: GuestDesktopTableProps) {
  const labels = useAccommodationLabels();
  const [toggledOutstandingGuests, setToggledOutstandingGuests] = useState<Set<string>>(new Set());

  const handleToggleOutstandingDisplay = (guestId: string) => {
    setToggledOutstandingGuests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        newSet.add(guestId);
      }
      return newSet;
    });
  };

  return (
    <div className="overflow-x-auto hidden md:block">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[100px]">
              <div className="flex items-center gap-1">
                {labels.singular}
                <SortButton field="unitNumber" currentSort={sortConfig} onSort={onSort} />
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
            {!isCondensedView && (
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
            )}
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                {isCondensedView ? 'In' : 'Check-in'}
                <SortButton field="checkinTime" currentSort={sortConfig} onSort={onSort} />
              </div>
            </th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                {isCondensedView ? 'Out' : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">Checkout</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Expected checkout date/time</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <SortButton field="expectedCheckoutDate" currentSort={sortConfig} onSort={onSort} />
              </div>
            </th>
            {!isCondensedView && (
              <>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </>
            )}
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.map((item) => {
            if (item.type === 'guest') {
              return (
                <GuestRow
                  key={item.data.id}
                  guest={item.data}
                  isCondensedView={isCondensedView}
                  isMobile={isMobile}
                  isAuthenticated={isAuthenticated}
                  availableUnits={availableUnits}
                  checkoutMutation={checkoutMutation}
                  onCheckout={onCheckout}
                  onGuestClick={onGuestClick}
                  onExtend={onExtend}
                  openAlertDialog={openAlertDialog}
                  onUnitChange={onUnitChange}
                  toggledOutstandingGuests={toggledOutstandingGuests}
                  onToggleOutstanding={handleToggleOutstandingDisplay}
                />
              );
            } else if (item.type === 'pending') {
              return (
                <PendingRow
                  key={`pending-${item.data.id}`}
                  pendingData={item.data}
                  isCondensedView={isCondensedView}
                  isAuthenticated={isAuthenticated}
                  availableUnits={availableUnits}
                  activeTokens={activeTokens}
                  cancelTokenMutation={cancelTokenMutation}
                  updateTokenUnitMutation={updateTokenUnitMutation}
                  onCancelToken={onCancelToken}
                  onTokenUnitChange={onTokenUnitChange}
                  copyToClipboard={copyToClipboard}
                  getCheckinLink={getCheckinLink}
                />
              );
            } else if (item.type === 'empty') {
              return (
                <EmptyRow
                  key={`empty-${item.data.id}`}
                  emptyData={item.data}
                  isCondensedView={isCondensedView}
                  onEmptyUnitClick={onEmptyUnitClick}
                />
              );
            }
            return null;
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Guest Row ----------

interface GuestRowProps {
  guest: Guest;
  isCondensedView: boolean;
  isMobile: boolean;
  isAuthenticated: boolean;
  availableUnits: AvailableUnit[];
  checkoutMutation: any;
  onCheckout: (guestId: string) => void;
  onGuestClick: (guest: Guest) => void;
  onExtend: (guest: Guest) => void;
  openAlertDialog: (guest: Guest) => void;
  onUnitChange: (guest: Guest, newUnitNumber: string) => void;
  toggledOutstandingGuests: Set<string>;
  onToggleOutstanding: (guestId: string) => void;
}

function GuestRow({
  guest,
  isCondensedView,
  isMobile,
  isAuthenticated,
  availableUnits,
  checkoutMutation,
  onCheckout,
  onGuestClick,
  onExtend,
  openAlertDialog,
  onUnitChange,
  toggledOutstandingGuests,
  onToggleOutstanding,
}: GuestRowProps) {
  const genderIcon = getGenderIcon(guest.gender || undefined);
  const isGuestCheckingOut = checkoutMutation.isPending && checkoutMutation.variables === guest.id;
  const stayDays = calculatePlannedStayDays(guest.checkinTime, guest.expectedCheckoutDate);
  const statusInfo = getGuestStatusInfo(guest);

  return (
    <SwipeableGuestRow
      guest={guest}
      onCheckout={onCheckout}
      onGuestClick={onGuestClick}
      onExtend={onExtend}
      isCondensedView={isCondensedView}
      isMobile={isMobile}
      isCheckingOut={isGuestCheckingOut}
    >
      {/* Accommodation column - sticky first column */}
      <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-white z-10 min-w-[100px]">
        <UnitSelector
          guest={guest}
          isAuthenticated={isAuthenticated}
          availableUnits={availableUnits}
          onUnitChange={onUnitChange}
        />
      </td>
      {/* Guest column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className={`w-6 h-6 ${genderIcon.bgColor} rounded-full flex items-center justify-center mr-2`}>
            {isCondensedView ? (
              <span className={`${genderIcon.textColor} font-bold text-xs`}>
                {getFirstInitial(guest.name)}
              </span>
            ) : genderIcon.icon ? (
              <span className={`${genderIcon.textColor} font-bold text-sm`}>{genderIcon.icon}</span>
            ) : (
              <span className={`${genderIcon.textColor} font-medium text-xs`}>{getInitials(guest.name)}</span>
            )}
          </div>
          {!isCondensedView && (
            <button
              onClick={() => onGuestClick(guest)}
              className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${stayDays >= 7 ? 'text-amber-800 bg-amber-50 rounded px-1' : 'text-hostel-text hover:text-orange-700'}`}
            >
              {isMobile ? truncateName(guest.name) : guest.name}
            </button>
          )}
        </div>
      </td>
      {/* Nationality column - only in detailed view */}
      {!isCondensedView && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
          {guest.nationality ? (
            <span className="font-medium">{guest.nationality}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      )}
      {/* Check-in column */}
      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
        {isCondensedView
          ? formatShortDate(guest.checkinTime.toString())
          : formatShortDateTime(guest.checkinTime.toString())
        }
      </td>
      {/* Checkout column */}
      <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
        {guest.expectedCheckoutDate ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAlertDialog(guest);
            }}
            className="group flex items-center gap-1.5 hover:bg-gray-50 rounded-md px-1 -mx-1 transition-colors"
            title="Set checkout reminder"
          >
            <span className="font-medium">
              {formatShortDate(guest.expectedCheckoutDate)}
            </span>
            <Bell className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      {/* Payment and Status columns - only in detailed view */}
      {!isCondensedView && (
        <>
          <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
            {guest.paymentAmount ? (
              <div>
                <div className={`font-medium ${isGuestPaid(guest) ? '' : 'text-red-600'}`}>
                  RM {guest.paymentAmount}
                </div>
                <div className="text-xs text-gray-500">{guest.paymentCollector || 'N/A'}</div>
              </div>
            ) : (
              <span className="text-gray-400">No payment</span>
            )}
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            {statusInfo ? (
              isCondensedView ? (
                statusInfo.icon
              ) : (
                <Badge
                  variant={statusInfo.variant}
                  className={`${statusInfo.className || ''} cursor-pointer hover:opacity-75 transition-opacity`}
                  onClick={() => statusInfo.label === 'Outstanding' && onToggleOutstanding(guest.id)}
                  title={statusInfo.label === 'Outstanding' ? 'Click to toggle amount' : ''}
                >
                  {statusInfo.label === 'Outstanding' && toggledOutstandingGuests.has(guest.id)
                    ? extractOutstandingAmount(guest) || statusInfo.label
                    : statusInfo.label
                  }
                </Badge>
              )
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </td>
        </>
      )}
      {/* Actions column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExtend(guest)}
            className="text-green-700 border-green-600 hover:bg-green-50 font-medium p-1"
            title="Extend"
          >
            <CalendarPlus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheckout(guest.id)}
            disabled={checkoutMutation.isPending}
            isLoading={checkoutMutation.isPending && checkoutMutation.variables === guest.id}
            className="text-hostel-error hover:text-red-700 font-medium p-1"
            title="Checkout"
          >
            <UserMinus className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </SwipeableGuestRow>
  );
}

// ---------- Pending Row ----------

interface PendingRowProps {
  pendingData: any;
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
  cancelTokenMutation: any;
  updateTokenUnitMutation: any;
  onCancelToken: (tokenId: string) => void;
  onTokenUnitChange: (tokenId: string, unitNumber: string | null, autoAssign?: boolean) => void;
  copyToClipboard: (text: string) => void;
  getCheckinLink: (token: string) => string;
}

function PendingRow({
  pendingData,
  isCondensedView,
  isAuthenticated,
  availableUnits,
  activeTokens,
  cancelTokenMutation,
  updateTokenUnitMutation,
  onCancelToken,
  onTokenUnitChange,
  copyToClipboard,
  getCheckinLink,
}: PendingRowProps) {
  return (
    <tr key={`pending-${pendingData.id}`} className="bg-orange-50">
      {/* Accommodation column with copy icon - sticky first column */}
      <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-orange-50 z-10 min-w-[100px]">
        <div className="flex items-center gap-1">
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
              <SelectTrigger className="w-24 h-7 text-xs bg-orange-500 text-white border-orange-500 hover:bg-orange-600">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(getCheckinLink(activeTokens.find(t => t.id === pendingData.id)?.token || ''))}
            className="text-blue-600 hover:text-blue-800 font-medium p-1 text-xs"
            title="Copy check-in link"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </td>
      {/* Guest column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
            <span className="text-orange-600 font-bold text-sm">P</span>
          </div>
          {!isCondensedView && (
            <span className="text-sm font-medium text-orange-700">
              {pendingData.name}
            </span>
          )}
        </div>
      </td>
      {/* Nationality column - only in detailed view */}
      {!isCondensedView && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
          Pending
        </td>
      )}
      {/* Check-in column */}
      <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
        {isCondensedView
          ? formatShortDate(pendingData.createdAt)
          : formatShortDateTime(pendingData.createdAt)
        }
      </td>
      {/* Checkout column */}
      <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
        <span className="font-medium">
          Expires {formatShortDate(pendingData.expiresAt)}
        </span>
      </td>
      {/* Payment and Status columns - only in detailed view */}
      {!isCondensedView && (
        <>
          <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
            Awaiting self check-in
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 font-bold text-xs">P</span>
            </div>
          </td>
        </>
      )}
      {/* Actions column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCancelToken(pendingData.id)}
          disabled={cancelTokenMutation.isPending}
          className="text-orange-600 hover:text-orange-800 font-medium p-1 text-xs"
        >
          {cancelTokenMutation.isPending ? 'Cancelling...' : 'Cancel'}
        </Button>
      </td>
    </tr>
  );
}

// ---------- Empty Row ----------

interface EmptyRowProps {
  emptyData: any;
  isCondensedView: boolean;
  onEmptyUnitClick: (unitNumber: string) => void;
}

function EmptyRow({ emptyData, isCondensedView, onEmptyUnitClick }: EmptyRowProps) {
  return (
    <tr
      className="bg-red-50 hover:bg-red-100 cursor-pointer transition-colors"
      onClick={() => onEmptyUnitClick(emptyData.unitNumber)}
      title={`Click to check-in guest to ${emptyData.unitNumber}`}
    >
      {/* Accommodation column - sticky first column */}
      <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-red-50 z-10 min-w-[100px]">
        <Badge variant="outline" className="bg-red-600 text-white border-red-600">
          {emptyData.unitNumber}
        </Badge>
      </td>
      {/* Guest column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-2">
            <span className="text-red-600 font-bold text-sm">E</span>
          </div>
          {!isCondensedView && (
            <span className="text-sm font-medium text-red-700">
              Empty
            </span>
          )}
        </div>
      </td>
      {/* Nationality column - only in detailed view */}
      {!isCondensedView && (
        <td className="px-2 py-3 whitespace-nowrap text-xs text-red-600">
          -
        </td>
      )}
      {/* Check-in column */}
      <td className="px-2 py-3 whitespace-nowrap text-xs text-red-600">
        -
      </td>
      {/* Checkout column */}
      <td className="px-2 py-3 whitespace-nowrap text-xs text-red-600">
        -
      </td>
      {/* Payment and Status columns - only in detailed view */}
      {!isCondensedView && (
        <>
          <td className="px-2 py-3 whitespace-nowrap text-xs text-red-600">
            -
          </td>
          <td className="px-2 py-3 whitespace-nowrap">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold text-xs">E</span>
            </div>
          </td>
        </>
      )}
      {/* Actions column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <span className="text-xs text-red-600">Empty</span>
      </td>
    </tr>
  );
}
