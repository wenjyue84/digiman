import { AlertCircle, CheckCircle } from "lucide-react";

interface ValidationHelpersProps {
  errors: Record<string, any>;
  fieldName: string;
  hint?: string;
  className?: string;
}

export function ValidationHelpers({ errors, fieldName, hint, className = "" }: ValidationHelpersProps) {
  const error = errors[fieldName];
  
  return (
    <div className={className}>
      {hint && (
        <p className="text-xs text-gray-500 mt-1">{hint}</p>
      )}
      {error && (
        <div className="flex items-center gap-2 mt-1 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error.message || `Error in ${fieldName} field`}</span>
        </div>
      )}
    </div>
  );
}

export function ValidationSummary({ errors }: { errors: Record<string, any> }) {
  if (Object.keys(errors).length === 0) return null;
  
  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
      <ul className="list-disc list-inside space-y-1">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field} className="text-sm text-red-600">
            {error?.message || `Error in ${field} field`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700">
      <CheckCircle className="h-5 w-5" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
