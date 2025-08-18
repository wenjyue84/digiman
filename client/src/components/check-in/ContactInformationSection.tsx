import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Phone } from "lucide-react";
import type { InsertGuest } from "@shared/schema";
import { ContactInfoSection } from "@/components/ui/section-container";
import { PhoneField, EmailField } from "@/components/ui/form-field";

interface ContactInformationSectionProps {
  form: UseFormReturn<InsertGuest>;
}

export default function ContactInformationSection({ form }: ContactInformationSectionProps) {
  return (
    <ContactInfoSection 
      icon={<Phone />}
      subtitle="(Optional for admin)"
      contentClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4"
    >
      <PhoneField
        name="phoneNumber"
        label="Phone Number"
        form={form}
        placeholder="e.g., +60123456789"
      />
      
      <EmailField
        name="email" 
        label="Email Address"
        form={form}
        placeholder="guest@example.com"
      />
    </ContactInfoSection>
  );
}