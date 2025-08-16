import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, Send, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import GuestSuccessPageTemplate from "@/components/guest-success/GuestSuccessPageTemplate";

interface SuccessScreenProps {
  guestInfo: {
    capsuleNumber?: string;
    autoAssign?: boolean;
    guestName: string;
    phoneNumber: string;
    email?: string;
    expectedCheckoutDate?: string;
    position: string;
  } | null;
  settings: any;
  assignedCapsuleNumber: string | null;
  capsuleIssues: any[];
  canEdit: boolean;
  editExpiresAt: Date | null;
  editToken: string;
  showEmailDialog: boolean;
  setShowEmailDialog: (show: boolean) => void;
  emailForSlip: string;
  setEmailForSlip: (email: string) => void;
  handlePrint: () => void;
  handleSaveAsPdf: () => void;
  handleSendEmail: () => void;
}

export default function SuccessScreen({
  guestInfo,
  settings,
  assignedCapsuleNumber,
  capsuleIssues,
  canEdit,
  editExpiresAt,
  editToken,
  showEmailDialog,
  setShowEmailDialog,
  emailForSlip,
  setEmailForSlip,
  handlePrint,
  handleSaveAsPdf,
  handleSendEmail,
}: SuccessScreenProps) {
  const { t } = useI18n();
  // Derive a reliable capsule number
  const storedCapsuleNumber = (typeof window !== 'undefined') ? localStorage.getItem('lastAssignedCapsule') : null;
  const displayCapsuleNumber = assignedCapsuleNumber || guestInfo?.capsuleNumber || storedCapsuleNumber || "";
  if (process.env.NODE_ENV !== 'production') {
    // Lightweight debug to help diagnose missing capsule numbers during development
    console.log('[SuccessScreen] capsule numbers', {
      assignedCapsuleNumber,
      guestInfoCapsule: guestInfo?.capsuleNumber,
      storedCapsuleNumber,
      displayCapsuleNumber,
    });
  }

  return (
    <div className="min-h-screen py-8">
      <GuestSuccessPageTemplate
        viewMode="desktop"
        isPreview={false}
        guestInfo={guestInfo}
        assignedCapsuleNumber={assignedCapsuleNumber}
        capsuleIssues={capsuleIssues}
        settings={settings}
      />

      {/* Edit Section */}
      {canEdit && editExpiresAt && new Date() < editExpiresAt && (
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm font-medium text-yellow-800">{t.infoEditable}</span>
            </div>
            <p className="text-xs text-yellow-700">
              {t.editUntil} {editExpiresAt.toLocaleTimeString()}.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => {
                // Navigate back to edit form
                window.location.href = `/guest-edit?token=${editToken}`;
              }}
            >
              {t.editMyInfo}
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            {t.printCheckInSlip}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEmailForSlip(guestInfo?.email || "");
              setShowEmailDialog(true);
            }}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveAsPdf}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t.saveAsPdf}
          </Button>
        </div>
      </div>
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.sendCheckInSlipEmail}</DialogTitle>
            <DialogDescription>
              {t.enterEmailForSlip}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="email-slip">{t.emailAddress}</Label>
              <Input
                id="email-slip"
                type="email"
                placeholder="your.email@example.com"
                value={emailForSlip}
                onChange={(e) => setEmailForSlip(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEmailDialog(false)}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleSendEmail}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}