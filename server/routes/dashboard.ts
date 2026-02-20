import { Router } from "express";
import { getStorage } from "../Storage/StorageFactory.js";
// REFACTORING: Import new utility functions to eliminate duplication
import { asyncRouteHandler } from "../lib/errorHandler";
import { authenticateToken } from "./middleware/auth";

const router = Router();

// Get storage type info
router.get("/storage/info", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  const storage = await getStorage();
  const storageType = storage.constructor.name;
  const isDatabase = storageType === 'DatabaseStorage';
  res.json({ 
    type: storageType,
    isDatabase,
    label: isDatabase ? 'Database' : 'Memory'
  });
}));

// Get occupancy summary - with caching
router.get("/occupancy", authenticateToken, asyncRouteHandler(async (_req: any, res: any) => {
  // Cache occupancy data for 30 seconds
  res.set('Cache-Control', 'public, max-age=30');
  const storage = await getStorage();
  const occupancy = await storage.getUnitOccupancy();
  res.json(occupancy);
}));

// Bulk dashboard data endpoint - fetch all main dashboard data in one request
router.get("/dashboard", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  // Cache dashboard data for 15 seconds
  res.set('Cache-Control', 'public, max-age=15');
  
  const storage = await getStorage();
  
  // Fetch all dashboard data concurrently for better performance
  const [
    occupancyData,
    guestsResponse,
    activeTokensResponse,
    unreadNotificationsResponse
  ] = await Promise.all([
    storage.getUnitOccupancy(),
    storage.getCheckedInGuests(),
    storage.getActiveGuestTokens(),
    storage.getUnreadAdminNotifications()
  ]);

  res.json({
    occupancy: occupancyData,
    guests: guestsResponse,
    activeTokens: activeTokensResponse,
    unreadNotifications: unreadNotificationsResponse,
    timestamp: new Date().toISOString()
  });
}));

// Calendar occupancy data — filtered by month date range (US-167)
router.get("/calendar/occupancy/:year/:month", authenticateToken, asyncRouteHandler(async (req: any, res: any) => {
  const { year, month } = req.params;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ message: "Invalid year or month" });
  }

  // Compute the date range for this month
  const monthStart = new Date(yearNum, monthNum - 1, 1);            // first day 00:00:00
  const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // last day 23:59:59

  // Fetch only guests whose stay overlaps this month (not all guests)
  const storage = await getStorage();
  const guestsInRange = await storage.getGuestsByDateRange(monthStart, monthEnd);

  if (!guestsInRange || guestsInRange.length === 0) {
    // Return an empty calendar structure
    const emptyCalendar: any = {};
    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      emptyCalendar[dateString] = {
        checkins: [],
        checkouts: [],
        expectedCheckouts: [],
        occupancy: 0,
        totalUnits: 22
      };
    }
    return res.json(emptyCalendar);
  }

  // Create calendar data structure
  const calendarData: any = {};
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${yearNum}-${monthNum.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    calendarData[dateString] = {
      checkins: [],
      checkouts: [],
      expectedCheckouts: [],
      occupancy: 0,
      totalUnits: 22
    };
  }

  // Process guests to populate calendar data
  guestsInRange.forEach(guest => {
    const checkinDate = new Date(guest.checkinTime).toISOString().split('T')[0];
    const checkoutDate = guest.checkoutTime ? new Date(guest.checkoutTime).toISOString().split('T')[0] : null;
    const expectedCheckoutDate = guest.expectedCheckoutDate || null;

    // Add check-ins
    if (calendarData[checkinDate]) {
      calendarData[checkinDate].checkins.push(guest);
    }

    // Add check-outs
    if (checkoutDate && calendarData[checkoutDate]) {
      calendarData[checkoutDate].checkouts.push(guest);
    }

    // Add expected check-outs
    if (expectedCheckoutDate && calendarData[expectedCheckoutDate]) {
      calendarData[expectedCheckoutDate].expectedCheckouts.push(guest);
    }

    // Calculate occupancy for each day
    const checkinDateObj = new Date(guest.checkinTime);
    const checkoutDateObj = guest.checkoutTime ? new Date(guest.checkoutTime) : new Date();

    // Iterate through each day the guest was present
    let currentDate = new Date(checkinDateObj);
    while (currentDate <= checkoutDateObj) {
      const currentDateString = currentDate.toISOString().split('T')[0];
      if (calendarData[currentDateString] && guest.isCheckedIn) {
        calendarData[currentDateString].occupancy++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  res.json(calendarData);
}));

export default router;