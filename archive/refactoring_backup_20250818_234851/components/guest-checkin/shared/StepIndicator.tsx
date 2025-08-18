import { CheckCircle, Circle } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function StepIndicator({ currentStep, totalSteps, steps }: StepIndicatorProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index < currentStep 
                  ? 'bg-green-500 text-white' 
                  : index === currentStep 
                  ? 'bg-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index < currentStep ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              <span className={`text-xs mt-1 text-center ${
                index === currentStep ? 'text-orange-600 font-medium' : 'text-gray-500'
              }`}>
                {step}
              </span>
            </div>
            {index < totalSteps - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
