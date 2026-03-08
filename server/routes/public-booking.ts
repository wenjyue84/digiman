import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { sendError, sendSuccess } from "../lib/apiResponse";
import sgMail from "@sendgrid/mail";

const router = Router();

// ─── Validation ──────────────────────────────────────────────────────────────

const publicBookingSchema = z.object({
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(7).max(20),
  guestNationality: z.string().min(2).max(50),
  numberOfGuests: z.number().int().min(1).max(10).default(1),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  specialRequests: z.string().max(500).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Count beds available for date range by checking per-unit reservation conflicts */
async function getAvailableBedCount(checkIn: Date, checkOut: Date): Promise<number> {
  const allUnits = await storage.getAllUnits();
  const rentableUnits = allUnits.filter(u => u.toRent !== false);
  const conflictChecks = await Promise.all(
    rentableUnits.map(u => storage.getReservationsByUnit(u.number, checkIn, checkOut))
  );
  return conflictChecks.filter(c => c.length === 0).length;
}

/** Fetch price per night from settings, falling back to RM 35 */
async function getPricePerNight(): Promise<number> {
  try {
    const s = await storage.getSetting("pricePerNight");
    if (s) return parseFloat(s.value) || 35;
  } catch { /* ignore */ }
  return 35;
}

/** Generate confirmation number: PLG-YYYYMMDD-NNN */
async function generateConfirmationNumber(): Promise<string> {
  const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const prefix = `PLG-${dateStr}`;
  const existing = await storage.getReservations();
  const seq = String(existing.data.filter(r => r.confirmationNumber.startsWith(prefix)).length + 1).padStart(3, "0");
  return `${prefix}-${seq}`;
}

function buildEmailHtml(data: {
  guestName: string;
  confirmationNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  nights: number;
  totalAmount: string;
  checkInLink: string | null;
}): string {
  const waPhone = (process.env.HOSTEL_WHATSAPP || "601154290183").replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi, I need to cancel booking ${data.confirmationNumber}`)}`;
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a">
      <h1 style="color:#8B5CF6;margin-bottom:4px">Pelangi Capsule Hostel</h1>
      <p style="color:#6b7280;margin-top:0">Your booking is confirmed!</p>
      <hr style="border:1px solid #e5e7eb;margin:16px 0"/>
      <p>Dear <strong>${data.guestName}</strong>,</p>
      <p>Thank you for booking with us. Here are your reservation details:</p>
      <table style="border-collapse:collapse;width:100%;margin:16px 0">
        <tr style="background:#f9fafb"><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Confirmation No.</td><td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace;font-size:16px;color:#8B5CF6">${data.confirmationNumber}</td></tr>
        <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Check-in</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${data.checkInDate}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Check-out</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${data.checkOutDate}</td></tr>
        <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Guests</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${data.numberOfGuests} guest(s)</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Duration</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${data.nights} night(s)</td></tr>
        <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Total Amount</td><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:700;color:#059669">RM ${data.totalAmount}</td></tr>
        <tr style="background:#f9fafb"><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600">Payment</td><td style="padding:10px 12px;border:1px solid #e5e7eb">Pay at Arrival (Cash/Online)</td></tr>
      </table>
      ${data.checkInLink ? `
      <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 12px;font-weight:600;color:#7c3aed">Self Check-in Available</p>
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280">Save time on arrival — complete your check-in online before you arrive.</p>
        <a href="${data.checkInLink}" style="background:#8B5CF6;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block">Complete Self Check-in</a>
      </div>` : ""}
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-weight:600;color:#92400e">Cancellation Policy</p>
        <p style="margin:0;font-size:14px;color:#78350f">To cancel or modify your booking, please WhatsApp us: <a href="${waLink}" style="color:#d97706">Click here to message us</a></p>
      </div>
      <p style="font-size:14px;color:#6b7280">We look forward to welcoming you!<br/>— Pelangi Capsule Hostel Team</p>
    </div>
  `;
}

// ─── GET /api/public/availability ────────────────────────────────────────────

router.get("/availability", async (req, res) => {
  try {
    const { checkIn, checkOut, guests } = req.query;

    if (!checkIn || !checkOut) {
      return sendError(res, 400, "checkIn and checkOut are required");
    }

    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return sendError(res, 400, "Invalid date format — use YYYY-MM-DD");
    }
    if (checkInDate >= checkOutDate) {
      return sendError(res, 400, "Check-out must be after check-in");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      return sendError(res, 400, "Check-in date cannot be in the past");
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000);
    const guestsCount = Math.max(1, parseInt(guests as string) || 1);
    const [availableCount, pricePerNight] = await Promise.all([
      getAvailableBedCount(checkInDate, checkOutDate),
      getPricePerNight(),
    ]);

    sendSuccess(res, {
      available: availableCount >= guestsCount,
      availableCount,
      nights,
      pricePerNight,
      totalPrice: pricePerNight * nights * guestsCount,
      currency: "MYR",
    });
  } catch (error: any) {
    console.error("[Public Booking] Availability check error:", error.message);
    sendError(res, 500, "Failed to check availability");
  }
});

// ─── POST /api/public/booking ─────────────────────────────────────────────────

router.post("/booking", async (req, res) => {
  try {
    const data = publicBookingSchema.parse(req.body);

    const checkInDate = new Date(data.checkInDate);
    const checkOutDate = new Date(data.checkOutDate);

    // Date validation
    if (checkInDate >= checkOutDate) {
      return sendError(res, 400, "Check-out must be after check-in");
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      return sendError(res, 400, "Check-in date cannot be in the past");
    }

    // Availability check
    const available = await getAvailableBedCount(checkInDate, checkOutDate);
    if (available < data.numberOfGuests) {
      return sendError(res, 409, `Only ${available} bed(s) available for the selected dates`);
    }

    const [confirmationNumber, pricePerNight] = await Promise.all([
      generateConfirmationNumber(),
      getPricePerNight(),
    ]);

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000);
    const totalAmount = String((pricePerNight * nights * data.numberOfGuests).toFixed(2));

    // Create reservation
    await storage.createReservation({
      confirmationNumber,
      guestName: data.guestName,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail,
      guestNationality: data.guestNationality,
      numberOfGuests: data.numberOfGuests,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfNights: nights,
      totalAmount,
      status: "pending",
      source: "online",
      specialRequests: data.specialRequests || null,
      createdBy: null as any, // public booking — no admin user
    } as any);

    console.log(`[Public Booking] Created ${confirmationNumber} for ${data.guestName} (${data.checkInDate} → ${data.checkOutDate})`);

    // Generate check-in token (non-blocking — server calls itself internally)
    let checkInLink: string | null = null;
    try {
      const port = process.env.PORT || 5000;
      const tokenResp = await fetch(`http://127.0.0.1:${port}/api/guest-tokens/internal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: data.guestName,
          phoneNumber: data.guestPhone,
          expectedCheckoutDate: data.checkOutDate,
        }),
      });
      if (tokenResp.ok) {
        const td = await tokenResp.json();
        checkInLink = td.data?.link || null;
      }
    } catch (e: any) {
      console.error("[Public Booking] Token gen failed (non-blocking):", e.message);
    }

    // WhatsApp notification via Rainbow AI (fire-and-forget)
    (async () => {
      try {
        const rainbowPort = process.env.RAINBOW_PORT || 3002;
        await fetch(`http://localhost:${rainbowPort}/api/rainbow/notify-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            guestName: data.guestName,
            phoneNumber: data.guestPhone,
            confirmationNumber,
            checkInDate: data.checkInDate,
            checkOutDate: data.checkOutDate,
            numberOfGuests: data.numberOfGuests,
            totalAmount,
            checkInLink,
          }),
        });
      } catch { /* non-blocking */ }
    })();

    // Email confirmation via SendGrid (fire-and-forget)
    (async () => {
      try {
        const apiKey = process.env.SENDGRID_API_KEY;
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@pelangicapsulehostel.com";
        if (apiKey && data.guestEmail) {
          sgMail.setApiKey(apiKey);
          await sgMail.send({
            to: data.guestEmail,
            from: fromEmail,
            subject: `Booking Confirmed — ${confirmationNumber} | Pelangi Capsule Hostel`,
            html: buildEmailHtml({
              guestName: data.guestName,
              confirmationNumber,
              checkInDate: data.checkInDate,
              checkOutDate: data.checkOutDate,
              numberOfGuests: data.numberOfGuests,
              nights,
              totalAmount,
              checkInLink,
            }),
          });
          console.log(`[Public Booking] Email sent to ${data.guestEmail}`);
        }
      } catch (e: any) {
        console.error("[Public Booking] Email error (non-blocking):", e.message);
      }
    })();

    sendSuccess(res, {
      confirmationNumber,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      numberOfGuests: data.numberOfGuests,
      nights,
      totalAmount,
      currency: "MYR",
      checkInLink,
      status: "pending",
    }, "Booking confirmed! Check your email for details.");
  } catch (error: any) {
    console.error("[Public Booking] Booking error:", error);
    if (error instanceof z.ZodError) {
      return sendError(res, 400, "Invalid booking data", error.errors);
    }
    sendError(res, 500, error.message || "Failed to create booking");
  }
});

export default router;
