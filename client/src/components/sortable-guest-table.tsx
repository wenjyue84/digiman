import { useState, useEffect } from "react";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Undo2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import GuestDetailsModal from "./guest-details-modal";
import ExtendStayDialog from "./ExtendStayDialog";
import { CheckoutConfirmationDialog } from "./confirmation-dialog";
import CheckoutAlertDialog from "./CheckoutAlertDialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import type { Guest, PaginatedResponse } from "@shared/schema";
import type { AllUnit, AvailableUnit } from "./guest-table/types";
import { GuestTableHeader } from "./guest-table/GuestTableHeader";
import { GuestDesktopTable } from "./guest-table/GuestTableRow";
import { GuestCardView } from "./guest-table/GuestCardView";
import { useGuestSorting } from "./guest-table/useGuestSorting";
import { useGuestFiltering } from "./guest-table/useGuestFiltering";
import { useGuestMutations } from "./guest-table/useGuestMutations";

export default function SortableGuestTable() {
  const isMobile = useIsMobile();
  const { isAuthenticated, logout } = useAuth();
  const [isCondensedView, setIsCondensedView] = useState(() => isMobile);
  const [showAllUnits, setshowAllUnits] = useState(false);

  // Auto-switch view mode based on device type
  useEffect(() => {
    setIsCondensedView(isMobile);
  }, [isMobile]);

  // ---------- Data queries ----------

  const { data: settings } = useVisibilityQuery<{ showAllUnits?: boolean }>({
    queryKey: ["/api/settings"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (settings && typeof settings.showAllUnits === 'boolean') {
      setshowAllUnits(settings.showAllUnits);
    }
  }, [settings]);

  const { data: guestsResponse, isLoading } = useVisibilityQuery<PaginatedResponse<Guest>>({
    queryKey: ["/api/guests/checked-in"],
  });
  const guests = guestsResponse?.data || [];

  const { data: occupancy } = useVisibilityQuery<{ total: number; occupied: number; available: number }>({
    queryKey: ["/api/occupancy"],
  });

  const { data: activeTokensResponse } = useVisibilityQuery<PaginatedResponse<{
    id: string;
    token: string;
    unitNumber: string;
    guestName: string | null;
    phoneNumber: string | null;
    createdAt: string;
    expiresAt: string;
  }>>({
    queryKey: ["/api/guest-tokens/active"],
  });
  const activeTokens = activeTokensResponse?.data || [];

  const { data: allUnitsResponse } = useVisibilityQuery<AllUnit[]>({
    queryKey: ["/api/units"],
  });
  const allUnits = allUnitsResponse || [];
  const exportUnits = allUnitsResponse || [];

  const { data: availableUnits = [] } = useVisibilityQuery<AvailableUnit[]>({
    queryKey: ["/api/units/available"],
  });

  // ---------- Hooks ----------

  const { filters, setFilters, hasActiveGuestFilters, filteredData, clearFilters } = useGuestFiltering({
    guests,
    activeTokens,
    showAllUnits,
    allUnits,
  });

  const { sortConfig, sortedData, handleSort } = useGuestSorting(filteredData);

  const mutations = useGuestMutations({ guests, exportUnits, activeTokens });

  // ---------- Loading state ----------

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="w-20 h-6" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // ---------- Render ----------

  return (
    <Card>
      <GuestTableHeader
        showAllUnits={showAllUnits}
        occupancy={occupancy}
        allUnitsCount={allUnits.length}
        isMobile={isMobile}
        isAuthenticated={isAuthenticated}
        isCondensedView={isCondensedView}
        setIsCondensedView={setIsCondensedView}
        onUndo={mutations.handleUndo}
        isUndoPending={mutations.undoCheckoutMutation.isPending}
        filters={filters}
        setFilters={setFilters}
        hasActiveGuestFilters={hasActiveGuestFilters}
        setshowAllUnits={setshowAllUnits}
        onUpdateSetting={(val) => mutations.updateSettingsMutation.mutate(val)}
        onWhatsAppExport={mutations.handleWhatsAppExport}
        clearFilters={clearFilters}
        logout={logout}
      />

      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>
              {showAllUnits
                ? "No guests currently checked in, pending check-ins, or empty units found"
                : "No guests currently checked in or pending check-ins"
              }
            </p>
          </div>
        ) : (
          <GuestDesktopTable
            sortedData={sortedData}
            sortConfig={sortConfig}
            onSort={handleSort}
            isCondensedView={isCondensedView}
            isMobile={isMobile}
            isAuthenticated={isAuthenticated}
            availableUnits={availableUnits}
            activeTokens={activeTokens}
            checkoutMutation={mutations.checkoutMutation}
            cancelTokenMutation={mutations.cancelTokenMutation}
            updateTokenUnitMutation={mutations.updateTokenUnitMutation}
            onCheckout={mutations.handleCheckout}
            onGuestClick={mutations.handleGuestClick}
            onExtend={mutations.handleExtend}
            openAlertDialog={mutations.openAlertDialog}
            onUnitChange={mutations.handleUnitChange}
            onCancelToken={mutations.handleCancelToken}
            onTokenUnitChange={mutations.handleTokenUnitChange}
            copyToClipboard={mutations.copyToClipboard}
            getCheckinLink={mutations.getCheckinLink}
            onEmptyUnitClick={mutations.handleEmptyUnitClick}
          />
        )}

        {/* Mobile card view */}
        {sortedData.length > 0 && (
          <GuestCardView
            sortedData={sortedData}
            isCondensedView={isCondensedView}
            isAuthenticated={isAuthenticated}
            availableUnits={availableUnits}
            activeTokens={activeTokens}
            checkoutGuest={mutations.checkoutGuest}
            cancelTokenMutation={mutations.cancelTokenMutation}
            updateTokenUnitMutation={mutations.updateTokenUnitMutation}
            onCheckout={mutations.handleCheckout}
            onGuestClick={mutations.handleGuestClick}
            onExtend={mutations.handleExtend}
            openAlertDialog={mutations.openAlertDialog}
            onUnitChange={mutations.handleUnitChange}
            onTokenUnitChange={mutations.handleTokenUnitChange}
            onPendingCheckinClick={mutations.handlePendingCheckinClick}
            onEmptyUnitClick={mutations.handleEmptyUnitClick}
          />
        )}
      </CardContent>

      {/* Modals and Dialogs */}
      <GuestDetailsModal
        guest={mutations.selectedGuest}
        isOpen={mutations.isDetailsModalOpen}
        onClose={mutations.handleCloseModal}
      />

      <ExtendStayDialog
        guest={mutations.extendGuest}
        open={mutations.isExtendOpen}
        onOpenChange={(open) => {
          mutations.setIsExtendOpen(open);
          if (!open) mutations.setExtendGuest(null);
        }}
      />

      {mutations.checkoutGuest && (
        <CheckoutConfirmationDialog
          open={mutations.showCheckoutConfirmation}
          onOpenChange={mutations.setShowCheckoutConfirmation}
          onConfirm={mutations.confirmCheckout}
          guestName={mutations.checkoutGuest.name}
          unitNumber={mutations.checkoutGuest.unitNumber}
          isLoading={mutations.checkoutMutation.isPending}
        />
      )}

      {mutations.undoGuest && (
        <ConfirmationDialog
          open={mutations.showUndoConfirmation}
          onOpenChange={mutations.setShowUndoConfirmation}
          onConfirm={mutations.confirmUndo}
          title="Undo Checkout"
          description={`Are you sure you want to undo check-out for unit ${mutations.undoGuest.unitNumber} ${mutations.undoGuest.name}?`}
          confirmText="Undo"
          cancelText="Cancel"
          variant="info"
          icon={<Undo2 className="h-6 w-6 text-blue-600" />}
          isLoading={mutations.undoCheckoutMutation.isPending}
        />
      )}

      <CheckoutAlertDialog
        guest={mutations.alertDialogGuest}
        open={mutations.alertDialogOpen}
        onOpenChange={mutations.setAlertDialogOpen}
      />
    </Card>
  );
}
