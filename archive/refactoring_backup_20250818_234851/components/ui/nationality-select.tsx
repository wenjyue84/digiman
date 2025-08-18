import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const NATIONALITIES = [
  "Malaysian",
  "Singaporean", 
  "American",
  "Australian",
  "British",
  "Canadian",
  "Chinese",
  "Filipino",
  "French",
  "German",
  "Indonesian",
  "Indian",
  "Japanese",
  "Korean",
  "Thai",
  "Vietnamese",
  "Other"
] as const;

export type Nationality = typeof NATIONALITIES[number];

interface NationalitySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  disabled?: boolean;
}

export function NationalitySelect({
  value,
  onValueChange,
  placeholder = "Select nationality",
  defaultValue,
  className,
  disabled = false
}: NationalitySelectProps) {
  console.log('NationalitySelect rendering with value:', value);
  
  return (
    <Select
      value={value || undefined}
      onValueChange={(selectedValue) => {
        console.log('NationalitySelect onValueChange:', selectedValue);
        onValueChange?.(selectedValue);
      }}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {NATIONALITIES.map((nationality) => (
          <SelectItem key={nationality} value={nationality}>
            {nationality}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}