interface StepProgressIndicatorProps {
  currentStep: 1 | 2 | 3;
  completed: boolean;
}

export default function StepProgressIndicator({ currentStep, completed }: StepProgressIndicatorProps) {
  return (
    <div className="mt-4">
      {/* US-006: Responsive step indicator - simplified dots on very small screens */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`h-3 w-3 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0 ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
          <span className="hidden xs:inline sm:inline">Details</span>
          <span className="xs:hidden text-[10px]">1</span>
        </div>
        <div className={`h-[2px] w-6 sm:w-10 flex-shrink-0 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`h-3 w-3 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
          <span className="hidden xs:inline sm:inline">Payment</span>
          <span className="xs:hidden text-[10px]">2</span>
        </div>
        <div className={`h-[2px] w-6 sm:w-10 flex-shrink-0 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`h-3 w-3 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></span>
          <span className="hidden xs:inline sm:inline">Confirm</span>
          <span className="xs:hidden text-[10px]">3</span>
        </div>
      </div>
      {completed && (
        <div className="mt-2 text-green-700 text-sm text-center">Completed successfully!</div>
      )}
    </div>
  );
}
