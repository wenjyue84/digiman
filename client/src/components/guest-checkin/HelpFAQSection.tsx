import { HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface HelpFAQSectionProps {
  t: any; // i18n translations object
}

export function HelpFAQSection({ t }: HelpFAQSectionProps) {
  return (
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
  );
}
