interface StepProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
  completed: boolean;
}

export default function StepProgressIndicator({ currentStep, completed }: StepProgressIndicatorProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-center gap-3 text-xs text-gray-600">
        <div className={`flex items-center gap-2`}>
          <span className={`h-2.5 w-2.5 rounded-full ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
          <span>Details</span>
        </div>
        <div className={`h-[2px] w-10 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center gap-2`}>
          <span className={`h-2.5 w-2.5 rounded-full ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
          <span>Payment</span>
        </div>
        <div className={`h-[2px] w-10 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        <div className={`flex items-center gap-2`}>
          <span className={`h-2.5 w-2.5 rounded-full ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
          <span>Confirm</span>
        </div>
      </div>
      {completed && (
        <div className="mt-2 text-green-700 text-sm">Completed successfully!</div>
      )}
    </div>
  );
}