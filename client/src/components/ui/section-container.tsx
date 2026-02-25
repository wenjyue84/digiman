import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionContainerProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: 'blue' | 'green' | 'orange' | 'purple' | 'gray' | 'yellow';
  subtitle?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  orange: 'bg-orange-50 border-orange-200',
  purple: 'bg-purple-50 border-purple-200',
  gray: 'bg-gray-50 border-gray-200',
  yellow: 'bg-yellow-50 border-yellow-200',
} as const;

const sizeStyles = {
  sm: 'p-3 sm:p-3',
  md: 'p-3 sm:p-4',
  lg: 'p-4 sm:p-6',
} as const;

export function SectionContainer({
  title,
  children,
  icon,
  variant = 'blue',
  subtitle,
  className = '',
  headerClassName = '',
  contentClassName = '',
  size = 'md',
}: SectionContainerProps) {
  return (
    <div className={cn(
      'rounded-lg border',
      variantStyles[variant],
      sizeStyles[size],
      className
    )}>
      <h3 className={cn(
        "text-sm font-medium text-hostel-text mb-3 flex items-center",
        headerClassName
      )}>
        {icon && <span className="mr-2 h-4 w-4 flex-shrink-0">{icon}</span>}
        {title}
        {subtitle && (
          <span className="text-gray-500 text-xs ml-2">
            {subtitle}
          </span>
        )}
      </h3>
      <div className={contentClassName}>
        {children}
      </div>
    </div>
  );
}

// Specialized variants for common use cases
export function PersonalInfoSection({ children, ...props }: Omit<SectionContainerProps, 'variant' | 'title'>) {
  return (
    <SectionContainer
      title="Personal Information"
      variant="blue"
      {...props}
    >
      {children}
    </SectionContainer>
  );
}

export function ContactInfoSection({ children, ...props }: Omit<SectionContainerProps, 'variant' | 'title'>) {
  return (
    <SectionContainer
      title="Contact Information"
      variant="green"
      {...props}
    >
      {children}
    </SectionContainer>
  );
}

export function PaymentInfoSection({ children, ...props }: Omit<SectionContainerProps, 'variant' | 'title'>) {
  return (
    <SectionContainer
      title="Payment Information"
      variant="orange"
      {...props}
    >
      {children}
    </SectionContainer>
  );
}

export function DocumentsSection({ children, ...props }: Omit<SectionContainerProps, 'variant' | 'title'>) {
  return (
    <SectionContainer
      title="Documents"
      variant="purple"
      {...props}
    >
      {children}
    </SectionContainer>
  );
}

export function NotesSection({ children, ...props }: Omit<SectionContainerProps, 'variant' | 'title'>) {
  return (
    <SectionContainer
      title="Additional Notes"
      variant="gray"
      {...props}
    >
      {children}
    </SectionContainer>
  );
}

// Info Box Component for inline information display
export function InfoBox({ 
  children, 
  variant = 'blue', 
  icon,
  className = '',
}: {
  children: ReactNode;
  variant?: 'blue' | 'green' | 'orange' | 'yellow' | 'gray' | 'red';
  icon?: ReactNode;
  className?: string;
}) {
  const infoVariantStyles = {
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    green: 'text-green-700 bg-green-50 border-green-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
    yellow: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    gray: 'text-gray-700 bg-gray-50 border-gray-200',
    red: 'text-red-700 bg-red-50 border-red-200',
  } as const;

  return (
    <div className={cn(
      'mt-2 text-sm rounded border p-2 flex items-start gap-2',
      infoVariantStyles[variant],
      className
    )}>
      {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="flex-1">{children}</div>
    </div>
  );
}
