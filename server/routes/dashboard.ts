import { Router } from "express";
import { storage } from "../storage";
// REFACTORING: Import new utility functions to eliminate duplication
import { asyncRouteHandler } from "../lib/errorHandler";

const router = Router();

// Get storage type info
router.get("/storage/info", asyncRouteHandler(async (_req: any, res: any) => {
  const storageType = storage.constructor.name;
  const isDatabase = storageType === 'DatabaseStorage';
  res.json({ 
    type: storageType,
    isDatabase,
    label: isDatabase ? 'Database' : 'Memory'
  });
}));

// Get occupancy summary - with caching
router.get("/occupancy", asyncRouteHandler(async (_req: any, res: any) => {
  // Cache occupancy data for 30 seconds
  res.set('Cache-Control', 'public, max-age=30');
  const occupancy = await storage.getCapsuleOccupancy();
  res.json(occupancy);
}));

// Bulk dashboard data endpoint - fetch all main dashboard data in one request
router.get("/dashboard", asyncRouteHandler(async (req: any, res: any) => {
  // Cache dashboard data for 15 seconds
  res.set('Cache-Control', 'public, max-age=15');
  
  // Fetch all dashboard data concurrently for better performance
  const [
    occupancyData,
    guestsResponse,
    activeTokensResponse,
    unreadNotificationsResponse
  ] = await Promise.all([
    storage.getCapsuleOccupancy(),
    storage.getCheckedInGuests({ page: 1, limit: 20 }),
    storage.getActiveGuestTokens({ page: 1, limit: 20 }),
    storage.getUnreadAdminNotifications({ page: 1, limit: 20 })
  ]);

  res.json({
    occupancy: occupancyData,
    guests: guestsResponse,
    activeTokens: activeTokensResponse,
    unreadNotifications: unreadNotificationsResponse,
    timestamp: new Date().toISOString()
  });
}));

// Calendar occupancy data
router.get("/calendar/occupancy/:year/:month", asyncRouteHandler(async (req: any, res: any) => {
  const { year, month } = req.params;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);
  
  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ message: "Invalid year or month" });
  }

  // Get all guests for the month
  const allGuests = await storage.getAllGuests();
  
  if (!allGuests || !allGuests.data) {
    return res.json({
      checkins: [],
      checkouts: [],
      expectedCheckouts: [],
      occupancy: 0,
      totalCapsules: 22
    });
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
      totalCapsules: 22
    };
  }
  
  // Process guests to populate calendar data
  allGuests.data.forEach(guest => {
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