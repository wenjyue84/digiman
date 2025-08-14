import React from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  timeRemaining: string;
  tokenExpiresAt: Date | null;
  t: any; // i18n translation function
}

export default function CountdownTimer({ timeRemaining, tokenExpiresAt, t }: CountdownTimerProps) {
  if (!tokenExpiresAt) return null;
  
  const isExpired = timeRemaining === (t.linkExpired || "Link has expired");
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
      isExpired 
        ? "bg-red-50 text-red-700 border border-red-200" 
        : "bg-orange-50 text-orange-700 border border-orange-200"
    }`}>
      <Clock className="h-4 w-4" />
      <span>
        {isExpired 
          ? t.linkExpired || "Link has expired"
          : `${t.timeRemaining || "Time remaining"}: ${timeRemaining}`
        }
      </span>
    </div>
  );
}