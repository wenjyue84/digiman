import { useState, useRef, useCallback, useEffect, memo } from "react";
import { UserMinus, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Guest } from "@shared/schema";

interface SwipeableGuestCardProps {
  guest: Guest;
  onCheckout: (guestId: string) => void;
  onExtend?: (guest: Guest) => void;
  isCheckingOut?: boolean;
  children: React.ReactNode;
}

export const SwipeableGuestCard = memo(function SwipeableGuestCard({ guest, onCheckout, onExtend, isCheckingOut, children }: SwipeableGuestCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const maxSwipeRef = useRef<number>(0);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 120;

  const handleStart = useCallback((clientX: number) => {
    if (isCheckingOut) return;
    startXRef.current = clientX;
    startTimeRef.current = Date.now();
    // Don't immediately set isDragging to true - wait for actual movement
    maxSwipeRef.current = 0;
  }, [isCheckingOut]);

  const handleMove = useCallback((clientX: number) => {
    if (isCheckingOut) return;
    const delta = clientX - startXRef.current;
    
    // Only start dragging if the user has moved more than 10 pixels
    if (!isDragging && Math.abs(delta) > 10) {
      setIsDragging(true);
    }
    
    if (!isDragging) return;
    
    const clamped = Math.max(Math.min(delta, MAX_SWIPE), -MAX_SWIPE);
    setSwipeOffset(clamped);
    maxSwipeRef.current = Math.max(maxSwipeRef.current, Math.abs(clamped));
  }, [isDragging, isCheckingOut]);

  const handleEnd = useCallback(() => {
    if (isCheckingOut) return;
    
    // If we were dragging, handle the swipe action
    if (isDragging) {
      const swipeTime = Date.now() - startTimeRef.current;
      const quick = maxSwipeRef.current >= 50 && swipeTime < 300;
      const isRight = swipeOffset > 0;
      const isLeft = swipeOffset < 0;
      const reached = Math.abs(maxSwipeRef.current) >= SWIPE_THRESHOLD || quick;
      
      if (reached) {
        if (isLeft) {
          setSwipeOffset(-MAX_SWIPE);
          onCheckout(guest.id);
          setIsDragging(false);
          return;
        }
        if (isRight && onExtend) {
          setSwipeOffset(MAX_SWIPE);
          onExtend(guest);
          setIsDragging(false);
          return;
        }
      }
      setSwipeOffset(0);
    }
    
    // Always reset dragging state
    setIsDragging(false);
  }, [isDragging, isCheckingOut, swipeOffset, guest, onCheckout, onExtend]);

  useEffect(() => {
    if (!isCheckingOut && swipeOffset !== 0) {
      const t = setTimeout(() => setSwipeOffset(0), 120);
      return () => clearTimeout(t);
    }
  }, [isCheckingOut, swipeOffset]);

  const leftProgress = Math.min(Math.max(-swipeOffset / SWIPE_THRESHOLD, 0), 1);
  const rightProgress = Math.min(Math.max(swipeOffset / SWIPE_THRESHOLD, 0), 1);
  const backgroundColor =
    swipeOffset < 0
      ? `rgba(239, 68, 68, ${0.08 + leftProgress * 0.18})`
      : swipeOffset > 0
      ? `rgba(34, 197, 94, ${0.06 + rightProgress * 0.16})`
      : 'transparent';

  return (
    <div
      className={`relative transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isCheckingOut ? 'opacity-75' : ''}`}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        backgroundColor,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out, background-color 0.2s ease-out',
      }}
      onMouseDown={(e) => { handleStart(e.clientX); }}
      onMouseMove={(e) => { 
        handleMove(e.clientX); 
        if (isDragging) e.preventDefault();
      }}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (isDragging) handleEnd(); }}
      onTouchStart={(e) => { handleStart(e.touches[0].clientX); }}
      onTouchMove={(e) => { 
        handleMove(e.touches[0].clientX);
        if (isDragging) e.preventDefault();
      }}
      onTouchEnd={handleEnd}
    >
      {children}

      {swipeOffset > 10 && (
        <div
          className="absolute left-0 top-0 h-full flex items-center justify-center px-4 pointer-events-none rounded-l"
          style={{
            width: `${Math.min(swipeOffset, MAX_SWIPE)}px`,
            backgroundColor: rightProgress >= 1 ? '#16a34a' : '#22c55e',
            transition: isDragging ? 'none' : 'all 0.3s ease-out',
          }}
        >
          <div className="flex items-center text-white font-medium text-sm">
            {rightProgress >= 1 ? (
              <>
                <CalendarPlus className="h-4 w-4 mr-1" />
                Release to extend
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-1" />
                Swipe to extend
              </>
            )}
          </div>
        </div>
      )}

      {swipeOffset < -10 && (
        <div
          className="absolute right-0 top-0 h-full flex items-center justify-center px-4 pointer-events-none rounded-r"
          style={{
            width: `${Math.min(Math.abs(swipeOffset), MAX_SWIPE)}px`,
            backgroundColor: leftProgress >= 1 ? '#dc2626' : '#ef4444',
            transition: isDragging ? 'none' : 'all 0.3s ease-out',
          }}
        >
          <div className="flex items-center text-white font-medium text-sm">
            {leftProgress >= 1 ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                {isCheckingOut ? 'Checking out...' : 'Release to checkout'}
              </>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Swipe to checkout
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});


