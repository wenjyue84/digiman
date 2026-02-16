import { ReactNode } from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ValidationHelpers } from "@/components/shared-checkin/ValidationHelpers";
import { cn } from "@/lib/utils";
import { getCountryIndicatorText } from "@/lib/phoneCountryCodes";

export interface FormFieldProps {
  name: string;
  label: string;
  form: UseFormReturn<any>;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  hint?: string;
  required?: boolean;
  icon?: ReactNode;
  options?: Array<{ value: string; label: string }>;
  className?: string;
  inputClassName?: string;
  labelClassName?: string;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'search' | 'url';
  rows?: number; // for textarea
  min?: number; // for number inputs
  max?: number; // for number inputs
  step?: number; // for number inputs
}

export function FormField({
  name,
  label,
  form,
  type = "text",
  placeholder,
  hint,
  required = false,
  icon,
  options = [],
  className = "",
  inputClassName = "",
  labelClassName = "",
  disabled = false,
  autoComplete,
  inputMode,
  rows = 3,
  min,
  max,
  step,
}: FormFieldProps) {
  const errors = form.formState.errors;
  const hasError = !!errors[name];

  const labelClasses = cn(
    "text-sm font-medium text-hostel-text",
    required && "after:content-['*'] after:ml-1 after:text-red-500",
    icon && "flex items-center gap-2",
    labelClassName
  );

  const inputClasses = cn(
    "mt-1",
    hasError && "border-red-500 focus-visible:ring-red-500",
    inputClassName
  );

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            placeholder={placeholder}
            className={inputClasses}
            disabled={disabled}
            rows={rows}
            {...form.register(name)}
          />
        );

      case 'select':
        return (
          <Select
            value={form.watch(name) || ""}
            onValueChange={(value) => form.setValue(name, value)}
            disabled={disabled}
          >
            <SelectTrigger className={inputClasses}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return (
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
            className={inputClasses}
            disabled={disabled}
            autoComplete={autoComplete}
            inputMode={inputMode}
            min={min}
            max={max}
            step={step}
            {...form.register(name)}
          />
        );
    }
  };

  return (
    <div className={className}>
      <Label htmlFor={name} className={labelClasses}>
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {label}
      </Label>
      {renderInput()}
      <ValidationHelpers
        errors={errors}
        fieldName={name}
        hint={hint}
      />
    </div>
  );
}

// Specialized variants for common use cases
export function EmailField({ name = "email", label = "Email Address", ...props }: Omit<FormFieldProps, 'type'>) {
  return (
    <FormField
      name={name}
      label={label}
      type="email"
      autoComplete="email"
      inputMode="email"
      {...props}
    />
  );
}

export function PhoneField({ name = "phoneNumber", label = "Phone Number", ...props }: Omit<FormFieldProps, 'type'>) {
  const phoneValue = props.form.watch(name) || "";
  const countryIndicator = getCountryIndicatorText(phoneValue);
  
  return (
    <div className={props.className}>
      <FormField
        name={name}
        label={label}
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        {...props}
        className=""
      />
      {countryIndicator && (
        <p className="text-xs text-muted-foreground mt-1" data-testid="phone-country-indicator">
          {countryIndicator}
        </p>
      )}
    </div>
  );
}

export function NameField({ name = "fullName", label = "Full Name", ...props }: Omit<FormFieldProps, 'type'>) {
  return (
    <FormField
      name={name}
      label={label}
      type="text"
      autoComplete="name"
      {...props}
    />
  );
}

export function DateField({ name, label, ...props }: Omit<FormFieldProps, 'type'>) {
  return (
    <FormField
      name={name}
      label={label}
      type="date"
      {...props}
    />
  );
}

export function SelectField({ 
  name, 
  label, 
  options, 
  placeholder = "Select an option...", 
  ...props 
}: Omit<FormFieldProps, 'type'> & { options: Array<{ value: string; label: string }> }) {
  return (
    <FormField
      name={name}
      label={label}
      type="select"
      options={options}
      placeholder={placeholder}
      {...props}
    />
  );
}

export function TextareaField({ 
  name, 
  label, 
  rows = 3,
  ...props 
}: Omit<FormFieldProps, 'type'>) {
  return (
    <FormField
      name={name}
      label={label}
      type="textarea"
      rows={rows}
      {...props}
    />
  );
}