import React from 'react';
import { Switch } from '@/components/ui/switch';
import { ToggleLeft, ToggleRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ViewToggleProps {
  isCondensedView: boolean;
  onToggle: (isCondensed: boolean) => void;
  className?: string;
}

export function ViewToggle({ isCondensedView, onToggle, className = '' }: ViewToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Mobile: icons with tooltips */}
      <div className="md:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleLeft className="h-4 w-4 text-gray-600" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Condensed</TooltipContent>
        </Tooltip>
      </div>
      
      {/* Desktop: text label */}
      <span className="hidden md:inline text-xs text-gray-600">Condensed</span>
      
      <Switch 
        checked={!isCondensedView}
        onCheckedChange={(checked) => onToggle(!checked)}
      />
      
      {/* Desktop: text label */}
      <span className="hidden md:inline text-xs text-gray-600">Detailed</span>
      
      {/* Mobile: icons with tooltips */}
      <div className="md:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleRight className="h-4 w-4 text-gray-600" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Detailed</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}


