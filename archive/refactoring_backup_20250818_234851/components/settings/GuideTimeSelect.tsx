"use client"

import * as React from "react"
import { TimeSelect } from "@/components/ui/time-select"

interface GuideTimeSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  mode: "checkin" | "checkout"
}

// Extract time component like "3:00 PM" from strings such as "From 3:00 PM" or "Before 12:00 PM"
function extractTimeFromDescription(description?: string): string | undefined {
  if (!description) return undefined
  const match = description.match(/(\d{1,2}:\d{2}\s?[AP]M)/i)
  return match ? match[1].replace(/\s+/g, " ").toUpperCase() : undefined
}

export function GuideTimeSelect({ value, onValueChange, placeholder, className, mode }: GuideTimeSelectProps) {
  const normalizedTime = React.useMemo(() => extractTimeFromDescription(value), [value])

  const handleChange = React.useCallback((timeValue: string) => {
    if (!onValueChange) return
    const formatted = mode === "checkin" ? `From ${timeValue}` : `Before ${timeValue}`
    onValueChange(formatted)
  }, [onValueChange, mode])

  return (
    <TimeSelect
      value={normalizedTime}
      onValueChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  )
}


