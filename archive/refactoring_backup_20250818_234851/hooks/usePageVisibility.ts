import { useEffect, useState } from 'react';

/**
 * Custom hook to track page visibility state
 * Returns true when the page is visible, false when hidden
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Custom hook to pause a callback when the page is hidden
 * Useful for pausing polling or other periodic updates
 */
export function useVisibilityPause<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList = []
): T {
  const isVisible = usePageVisibility();

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    // Execute callback only when visible
    callback();
  }, [isVisible, ...deps]);

  // Return a wrapped version that checks visibility
  return ((...args: Parameters<T>) => {
    if (isVisible) {
      return callback(...args);
    }
  }) as T;
}