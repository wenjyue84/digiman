import { ListChildComponentProps } from "react-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { Guest, GuestToken } from "@shared/schema";
import { SwipeableGuestRow } from "./SwipeableGuestRow";
import {
  getInitials,
  truncateName,
  getFirstInitial,
  getGenderIcon,
  formatShortDateTime,
  formatShortDate
} from "./utils";
import { getGuestBalance, isGuestPaid } from "@/lib/guest";

interface RowData {
  items: Array<{ type: 'guest' | 'pending'; data: any }>;
  isCondensedView: boolean;
  onCheckout: (id: string) => void;
  onGuestClick: (guest: Guest) => void;
  onCancelToken: (id: string) => void;
  copyToClipboard: (text: string) => void;
  getCheckinLink: (token: string) => string;
  isAuthenticated: boolean;
  checkoutMutation: any;
  cancelTokenMutation: any;
  activeTokens: GuestToken[];
}

export function DesktopRow({ index, style, data }: ListChildComponentProps<RowData>) {
  const item = data.items[index];
  if (item.type === 'guest') {
    const guest = item.data as Guest;
    const genderIcon = getGenderIcon(guest.gender || undefined);
    const isGuestCheckingOut = data.checkoutMutation.isPending && data.checkoutMutation.variables === guest.id;
    return (
      <div style={style} className="min-w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white">
            <SwipeableGuestRow
              guest={guest}
              onCheckout={data.onCheckout}
              onGuestClick={data.onGuestClick}
              isCondensedView={data.isCondensedView}
              isCheckingOut={isGuestCheckingOut}
              isMobile={false}
            >
              <td className="px-2 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                  {guest.capsuleNumber}
                </Badge>
              </td>
              <td className="px-2 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className={`w-6 h-6 ${genderIcon.bgColor} rounded-full flex items-center justify-center mr-2`}>
                    {data.isCondensedView ? (
                      <span className={`${genderIcon.textColor} font-bold text-xs`}>
                        {getFirstInitial(guest.name)}
                      </span>
                    ) : genderIcon.icon ? (
                      <span className={`${genderIcon.textColor} font-bold text-sm`}>{genderIcon.icon}</span>
                    ) : (
                      <span className={`${genderIcon.textColor} font-medium text-xs`}>{getInitials(guest.name)}</span>
                    )}
                  </div>
                  {!data.isCondensedView && (
                    <button
                      onClick={() => data.onGuestClick(guest)}
                      className="text-sm font-medium text-hostel-text hover:text-orange-700 hover:underline cursor-pointer transition-colors"
                    >
                      {truncateName(guest.name)}
                    </button>
                  )}
                </div>
              </td>
              {!data.isCondensedView && (
                <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                  {guest.nationality ? (
                    <span className="font-medium">{guest.nationality}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              )}
              <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                {data.isCondensedView
                  ? formatShortDate(guest.checkinTime.toString())
                  : formatShortDateTime(guest.checkinTime.toString())}
              </td>
              <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                {guest.expectedCheckoutDate ? (
                  <span className="font-medium">{formatShortDate(guest.expectedCheckoutDate)}</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              {!data.isCondensedView && (
                <>
                  <td className="px-2 py-3 whitespace-nowrap text-xs text-gray-600">
                    {guest.paymentAmount ? (
                      <div>
                        <div className={`font-medium ${isGuestPaid(guest) ? '' : 'text-red-600'}`}>
                          RM {guest.paymentAmount}
                          {!isGuestPaid(guest) && getGuestBalance(guest) > 0 && (
                            <span className="text-red-600 text-xs font-medium ml-1">
                              (Balance: RM{getGuestBalance(guest)})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{guest.paymentCollector || 'N/A'}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">No payment</span>
                    )}
                  </td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </td>
                </>
              )}
              <td className="px-2 py-3 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onCheckout(guest.id);
                  }}
                  disabled={isGuestCheckingOut}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 text-xs"
                  aria-label="Check out guest"
                >
                  {isGuestCheckingOut ? 'Checking out...' : 'Checkout'}
                </Button>
              </td>
            </SwipeableGuestRow>
          </tbody>
        </table>
      </div>
    );
  } else {
    const pendingData = item.data;
    return (
      <div style={style} className="min-w-full">
        <table className="min-w-full divide-y divide-gray-200">
          <tbody className="bg-white">
            <tr className="hover:bg-orange-50 border-l-2 border-orange-300">
              <td className="px-2 py-3 whitespace-nowrap sticky left-0 bg-white z-10">
                <Badge variant="outline" className="bg-orange-100 text-orange-600 border-orange-300">
                  {pendingData.capsuleNumber}
                </Badge>
              </td>
              <td className="px-2 py-3 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2">
                    <span className="text-orange-600 font-bold text-xs">P</span>
                  </div>
                  {!data.isCondensedView && (
                    <span className="text-sm font-medium text-orange-700">
                      {pendingData.name}
                    </span>
                  )}
                </div>
              </td>
              {!data.isCondensedView && (
                <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                  {pendingData.phoneNumber || '-'}
                </td>
              )}
              <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                {data.isCondensedView
                  ? formatShortDate(pendingData.createdAt)
                  : formatShortDateTime(pendingData.createdAt)}
              </td>
              <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">
                <span className="font-medium">Expires {formatShortDate(pendingData.expiresAt)}</span>
              </td>
              {!data.isCondensedView && (
                <>
                  <td className="px-2 py-3 whitespace-nowrap text-xs text-orange-600">Awaiting self check-in</td>
                  <td className="px-2 py-3 whitespace-nowrap">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-xs">P</span>
                    </div>
                  </td>
                </>
              )}
              <td className="px-2 py-3 whitespace-nowrap">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => data.copyToClipboard(data.getCheckinLink(data.activeTokens.find(t => t.id === pendingData.id)?.token || ''))}
                  className="text-blue-600 hover:text-blue-800 font-medium p-1 text-xs"
                  title="Copy check-in link"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </td>
              <td className="px-2 py-3 whitespace-nowrap">
                {data.isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => data.onCancelToken(pendingData.id)}
                    disabled={data.cancelTokenMutation.isPending}
                    className="text-orange-600 hover:text-orange-800 font-medium p-1 text-xs"
                  >
                    {data.cancelTokenMutation.isPending ? 'Cancelling...' : 'Cancel'}
                  </Button>
                ) : (
                  <span className="text-xs text-orange-600">Pending</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
}