/**
 * Performance optimization hooks for Guest Guide system
 * Provides memoization, debouncing, and efficient state management
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useGuestGuide } from '@/lib/contexts/guest-guide-context';
import { GuestGuideContent, GuestGuideVisibility } from '@/lib/types/guest-guide';

/**
 * Debounced content update hook
 * Prevents excessive API calls during rapid typing
 */
export const useDebouncedContentUpdate = (delay: number = 300) => {
  const { updateContent } = useGuestGuide();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedUpdate = useCallback((field: keyof GuestGuideContent, value: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      updateContent({ [field]: value });
    }, delay);
  }, [updateContent, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedUpdate;
};

/**
 * Memoized content validation hook
 * Only revalidates when content actually changes
 */
export const useMemoizedContentValidation = () => {
  const { settings } = useGuestGuide();

  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!settings.content.intro?.trim()) {
      errors.push('Introduction text is required');
    }
    
    if (!settings.content.address?.trim()) {
      errors.push('Address information is required');
    }
    
    if (!settings.content.doorPassword?.trim()) {
      errors.push('Door password is required');
    }

    // URL validation for optional fields
    const urlFields = [
      { key: 'hostelPhotosUrl', label: 'Hostel Photos URL' },
      { key: 'googleMapsUrl', label: 'Google Maps URL' },
      { key: 'checkinVideoUrl', label: 'Check-in Video URL' }
    ];

    urlFields.forEach(({ key, label }) => {
      const url = settings.content[key as keyof GuestGuideContent] as string;
      if (url && url.trim() && !isValidUrl(url)) {
        warnings.push(`${label} appears to be invalid`);
      }
    });

    // Content length validation
    if (settings.content.intro && settings.content.intro.length > 1000) {
      warnings.push('Introduction text is quite long - consider shortening for better readability');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [settings.content]);

  return validation;
};

/**
 * Performance-optimized preview data hook
 * Memoizes preview data to prevent unnecessary re-renders
 */
export const useOptimizedPreviewData = () => {
  const { settings, previewMode } = useGuestGuide();

  const previewData = useMemo(() => ({
    content: settings.content,
    visibility: settings.visibility,
    previewMode,
    lastModified: settings.lastModified
  }), [settings.content, settings.visibility, previewMode, settings.lastModified]);

  return previewData;
};

/**
 * Lazy loading hook for non-critical components
 * Defers loading of heavy components until they're needed
 */
export const useLazyComponentLoader = () => {
  const isVisible = useRef(false);
  const observer = useRef<IntersectionObserver>();

  const setupIntersectionObserver = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    observer.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.current = true;
          observer.current?.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.current.observe(element);
  }, []);

  useEffect(() => {
    return () => {
      observer.current?.disconnect();
    };
  }, []);

  return {
    isVisible: isVisible.current,
    setupIntersectionObserver
  };
};

/**
 * Performance metrics hook
 * Tracks rendering performance and optimization opportunities
 */
export const usePerformanceMetrics = () => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (timeSinceLastRender < 16) { // Less than one frame at 60fps
        console.warn('[GuestGuide] Potential performance issue: Rapid re-renders detected');
      }
      
      if (renderCountRef.current > 100) {
        console.warn('[GuestGuide] High render count detected:', renderCountRef.current);
      }
    }
  });

  return {
    renderCount: renderCountRef.current,
    lastRenderTime: lastRenderTimeRef.current
  };
};

/**
 * Smart caching hook for expensive operations
 * Uses cache with TTL for expensive computations
 */
export const useSmartCache = <T>(
  key: string, 
  factory: () => T, 
  deps: any[], 
  ttl: number = 60000 // 1 minute default
) => {
  const cacheRef = useRef<Map<string, { value: T; expiry: number }>>(new Map());

  const cachedValue = useMemo(() => {
    const cached = cacheRef.current.get(key);
    const now = Date.now();

    if (cached && cached.expiry > now) {
      return cached.value;
    }

    const value = factory();
    cacheRef.current.set(key, {
      value,
      expiry: now + ttl
    });

    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ttl, ...deps]);

  return cachedValue;
};

// Helper functions
const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Bundle analyzer hook for development
 * Helps identify performance bottlenecks
 */
export const useBundleAnalyzer = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const analyzeBundle = async () => {
        const chunks = [];
        const scripts = document.querySelectorAll('script[src]');
        const scriptList = Array.from(scripts) as HTMLScriptElement[];

        for (const script of scriptList) {
          const src = (script as HTMLScriptElement).src;
          if (src.includes('localhost')) {
            chunks.push({
              src,
              size: 'unknown' // Would need server-side support to get actual sizes
            });
          }
        }

        console.group('[GuestGuide] Bundle Analysis');
        console.table(chunks);
        console.groupEnd();
      };

      // Delay analysis to allow all chunks to load
      setTimeout(analyzeBundle, 2000);
    }
  }, []);
};
