import { usePageVisibility } from '@/hooks/usePageVisibility';
import { Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Visual indicator showing whether the page is actively updating
 * Displays when tab visibility affects data refresh
 */
export function VisibilityIndicator() {
  const isVisible = usePageVisibility();

  return (
    <Badge 
      variant={isVisible ? "default" : "secondary"}
      className={`fixed bottom-4 right-4 z-50 transition-opacity ${
        isVisible ? 'opacity-0 hover:opacity-100' : 'opacity-100'
      }`}
    >
      {isVisible ? (
        <>
          <Eye className="w-3 h-3 mr-1" />
          <span className="text-xs">Live Updates</span>
        </>
      ) : (
        <>
          <EyeOff className="w-3 h-3 mr-1" />
          <span className="text-xs">Updates Paused</span>
        </>
      )}
    </Badge>
  );
}