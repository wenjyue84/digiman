import { useState, useMemo, useEffect, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, Bed, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { useVisibilityQuery } from "@/hooks/useVisibilityQuery";
import { Skeleton } from "@/components/ui/skeleton";
import type { Guest } from "@shared/schema";
import { getHolidayLabel, hasPublicHoliday, getHolidaysForDate, getMonthHolidays } from "@/lib/holidays";

interface DayData {
  date: string;
  checkins: Guest[];
  checkouts: Guest[];
  expectedCheckouts: Guest[];
  occupancy: number;
  totalCapsules: number;
}

interface CalendarData {
  [dateString: string]: DayData;
}

export default function OccupancyCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);

  useEffect(() => {
    const node = calendarRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsCalendarVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Fetch calendar data for the current month
  const { data: calendarData = {}, isLoading: isCalendarLoading } = useVisibilityQuery<CalendarData>({
    // Date.getMonth() is zero-indexed, but the API expects months 1-12
    queryKey: [
      "/api/calendar/occupancy",
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
    ],
    enabled: isCalendarVisible,
    // Uses smart config: nearRealtime (30s stale, 60s refetch) for calendar data
  });

  const { data: monthHolidays = [], isLoading: isMonthHolidaysLoading } = useVisibilityQuery({
    queryKey: ["/api/holidays", currentMonth.getFullYear(), currentMonth.getMonth()],
    enabled: isCalendarVisible,
    queryFn: async () => {
      return getMonthHolidays(currentMonth.getFullYear(), currentMonth.getMonth());
    },
  });

  const selectedDateData = useMemo(() => {
    if (!selectedDate) return null;
    const dateString = selectedDate.toISOString().split('T')[0];
    return calendarData[dateString] || null;
  }, [selectedDate, calendarData]);



  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  if (!isCalendarVisible || isCalendarLoading) {
    return (
      <Card ref={calendarRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Occupancy Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-80 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card ref={calendarRef}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Occupancy Calendar
        </CardTitle>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Check-ins</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Check-outs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-orange-400 rounded"></div>
              <span>80%+ Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-red-500 rounded"></div>
              <span>Full</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Festival</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-24 text-center">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {/* Holiday Alerts */}
            {isMonthHolidaysLoading ? (
              <div className="mb-4 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : monthHolidays.length > 0 && (
              <div className="mb-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Public Holidays & Festivals This Month
                </h4>
                <div className="space-y-2">
                  {monthHolidays.map(({ date, holidays }) => {
                    const dateObj = new Date(date);
                    const isPublicHoliday = holidays.some(h => h.isPublicHoliday);
                    const primaryHoliday = holidays.find(h => h.isPublicHoliday) || holidays[0];

                    return (
                      <div
                        key={date}
                        className={`${
                          isPublicHoliday
                            ? "text-green-700 bg-green-50 border-green-200"
                            : "text-blue-700 bg-blue-50 border-blue-200"
                        } text-sm rounded border p-3 flex items-start gap-2`}
                      >
                        <span>{isPublicHoliday ? "🎉" : "🗓️"}</span>
                        <div className="flex-1">
                          <div className="font-medium">
                            {dateObj.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div>
                            {isPublicHoliday ? "Public Holiday" : "Festival"}: {primaryHoliday.name}
                            {holidays.length > 1 && ` (+${holidays.length - 1} more)`}
                          </div>
                          {isPublicHoliday && (
                            <div className="text-xs text-green-600 mt-1 font-medium">
                              💡 Consider adjusting pricing for higher demand
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              className="w-full rounded-md border"
              modifiers={{
                hasData: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  return !!calendarData[dateString];
                },
                hasCheckins: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const dayData = calendarData[dateString];
                  return dayData && dayData.checkins.length > 0;
                },
                hasCheckouts: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const dayData = calendarData[dateString];
                  return dayData && dayData.checkouts.length > 0;
                },
                highOccupancy: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const dayData = calendarData[dateString];
                  if (!dayData || dayData.totalCapsules === 0) return false;
                  const occupancyRate = (dayData.occupancy / dayData.totalCapsules) * 100;
                  return occupancyRate > 80;
                },
                fullOccupancy: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const dayData = calendarData[dateString];
                  if (!dayData || dayData.totalCapsules === 0) return false;
                  const occupancyRate = (dayData.occupancy / dayData.totalCapsules) * 100;
                  return occupancyRate === 100;
                },
                holiday: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const dayHolidays = getHolidaysForDate(dateString);
                  return dayHolidays.length > 0;
                },
                publicHoliday: (date) => {
                  const dateString = date.toISOString().split('T')[0];
                  const dayHolidays = getHolidaysForDate(dateString);
                  return dayHolidays.some(h => h.isPublicHoliday);
                }
              }}
              modifiersClassNames={{
                hasCheckins: "relative after:absolute after:top-0 after:right-0 after:w-1.5 after:h-1.5 after:bg-green-500 after:rounded-full",
                hasCheckouts: "relative before:absolute before:top-0 before:left-0 before:w-1.5 before:h-1.5 before:bg-red-500 before:rounded-full",
                highOccupancy: "relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-orange-400 after:rounded",
                fullOccupancy: "relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-red-500 after:rounded",
                holiday: "relative before:absolute before:top-0 before:left-1/2 before:transform before:-translate-x-1/2 before:w-2 before:h-2 before:bg-blue-500 before:rounded-full",
                publicHoliday: "relative before:absolute before:top-0 before:left-1/2 before:transform before:-translate-x-1/2 before:w-2 before:h-2 before:bg-green-500 before:rounded-full"
              }}
            />
          </div>
          <div className="space-y-4 md:sticky md:top-20">
            {selectedDateData ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      {selectedDate?.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Holiday Alert for Selected Date */}
                    {(() => {
                      if (!selectedDate) return null;
                      const dateStr = selectedDate.toISOString().split('T')[0];
                      const label = getHolidayLabel(dateStr);
                      if (!label) return null;
                      const isPH = hasPublicHoliday(dateStr);
                      return (
                        <div className={`${
                          isPH 
                            ? "text-green-700 bg-green-50 border-green-200" 
                            : "text-blue-700 bg-blue-50 border-blue-200"
                        } text-sm rounded border p-3 flex items-start gap-2`}
                        >
                          <span>{isPH ? "🎉" : "🗓️"}</span>
                          <div className="flex-1">
                            <div className="font-medium">
                              {isPH ? "Public Holiday" : "Festival"}: {label}
                            </div>
                            {isPH && (
                              <div className="text-xs text-green-600 mt-1 font-medium">
                                💡 Consider adjusting pricing for higher demand
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4" />
                        <span className="text-sm">Occupancy</span>
                      </div>
                      <Badge variant={selectedDateData.occupancy === selectedDateData.totalCapsules ? "destructive" : 
                                   selectedDateData.occupancy > selectedDateData.totalCapsules * 0.8 ? "secondary" : "default"}>
                        {selectedDateData.occupancy}/{selectedDateData.totalCapsules}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Check-ins</span>
                      </div>
                      <Badge variant="outline" className="bg-green-50">
                        {selectedDateData.checkins.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-red-600" />
                        <span className="text-sm">Check-outs</span>
                      </div>
                      <Badge variant="outline" className="bg-red-50">
                        {selectedDateData.checkouts.length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <span className="text-sm">Expected Check-outs</span>
                      </div>
                      <Badge variant="outline" className="bg-orange-50">
                        {selectedDateData.expectedCheckouts.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                
                {selectedDateData.checkins.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-green-600">Check-ins</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedDateData.checkins.map((guest) => (
                          <div key={guest.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{guest.name}</span>
                            <Badge variant="outline">{guest.unitNumber}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedDateData.checkouts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-red-600">Check-outs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedDateData.checkouts.map((guest) => (
                          <div key={guest.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{guest.name}</span>
                            <Badge variant="outline">{guest.unitNumber}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedDateData.expectedCheckouts.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base text-orange-600">Expected Check-outs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {selectedDateData.expectedCheckouts.map((guest) => (
                          <div key={guest.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium">{guest.name}</span>
                            <Badge variant="outline">{guest.unitNumber}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : selectedDate ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No data available for this date</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select a date to view details</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}