import { HelpCircle, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UseFormReturn } from "react-hook-form";
import { GuestSelfCheckin } from "@shared/schema";
import { ValidationSummary } from "./shared/ValidationHelpers";

interface ReviewStepProps {
  form: UseFormReturn<GuestSelfCheckin>;
  errors: Record<string, any>;
  t: any;
  icDocumentUrl: string;
  passportDocumentUrl: string;
  isCheckOutDateValid: boolean;
}

export function ReviewStep({ 
  form, 
  errors, 
  t, 
  icDocumentUrl, 
  passportDocumentUrl, 
  isCheckOutDateValid 
}: ReviewStepProps) {
  const formValues = form.getValues();

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-hostel-text mb-3 flex items-center">
          <Info className="mr-2 h-4 w-4" />
          Review Your Information
        </h3>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Name:</span> {formValues.nameAsInDocument || 'Not provided'}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {formValues.phoneNumber || 'Not provided'}
            </div>
            <div>
              <span className="font-medium">Gender:</span> {formValues.gender || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Nationality:</span> {formValues.nationality || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Check-in Date:</span> {formValues.checkInDate || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Check-out Date:</span> {formValues.checkOutDate || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">IC Number:</span> {formValues.icNumber || 'Not provided'}
            </div>
            <div>
              <span className="font-medium">Passport Number:</span> {formValues.passportNumber || 'Not provided'}
            </div>
            <div>
              <span className="font-medium">Payment Method:</span> {formValues.paymentMethod || 'Not specified'}
            </div>
            <div>
              <span className="font-medium">Emergency Contact:</span> {formValues.emergencyContact || 'Not provided'}
            </div>
          </div>
          
          <div>
            <span className="font-medium">Documents Uploaded:</span>
            <div className="mt-1 space-y-1">
              {icDocumentUrl && <div className="text-green-600">✅ IC Document</div>}
              {passportDocumentUrl && <div className="text-green-600">✅ Passport Document</div>}
              {!icDocumentUrl && !passportDocumentUrl && <div className="text-red-600">❌ No documents uploaded</div>}
            </div>
          </div>

          {formValues.notes && (
            <div>
              <span className="font-medium">Additional Notes:</span>
              <div className="mt-1 p-2 bg-white border rounded text-gray-700">
                {formValues.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help & FAQ */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-hostel-text mb-2 flex items-center">
          <HelpCircle className="mr-2 h-4 w-4" />
          {t.faqNeedHelp}
        </h3>
        <p className="text-xs text-gray-600 mb-3">{t.faqIntro}</p>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="ic-vs-passport">
            <AccordionTrigger className="text-sm">{t.faqIcVsPassportQ}</AccordionTrigger>
            <AccordionContent className="text-sm text-gray-700">
              {t.faqIcVsPassportA}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="photo-upload">
            <AccordionTrigger className="text-sm">{t.faqPhotoUploadQ}</AccordionTrigger>
            <AccordionContent className="text-sm text-gray-700">
              {t.faqPhotoUploadA}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="phone-format">
            <AccordionTrigger className="text-sm">{t.faqPhoneFormatQ}</AccordionTrigger>
            <AccordionContent className="text-sm text-gray-700">
              {t.faqPhoneFormatA}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="gender-why">
            <AccordionTrigger className="text-sm">{t.faqGenderWhyQ}</AccordionTrigger>
            <AccordionContent className="text-sm text-gray-700">
              {t.faqGenderWhyA}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="privacy">
            <AccordionTrigger className="text-sm">{t.faqPrivacyQ}</AccordionTrigger>
            <AccordionContent className="text-sm text-gray-700">
              {t.faqPrivacyA}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="edit-after">
            <AccordionTrigger className="text-sm">{t.faqEditAfterQ}</AccordionTrigger>
            <AccordionContent className="text-sm text-gray-700">
              {t.faqEditAfterA}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Validation Summary */}
      <ValidationSummary errors={errors} />
    </div>
  );
}
