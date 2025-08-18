import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
}

export default function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const updateCountdown = () => {
      const diffMs = targetDate.getTime() - Date.now();
      if (diffMs <= 0) {
        setDisplay("Check-in time has arrived");
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSeconds / (24 * 3600));
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      setDisplay(
        `Check-in starts in ${days > 0 ? days + 'd ' : ''}${hours}h ${minutes}m`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!display) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm">
      <Clock className="h-4 w-4" />
      <span>{display}</span>
    </div>
  );
}
