import { Router } from "express";
import { storage } from "../storage";
import {
  authTests,
  guestTests,
  capsuleTests,
  financialTests,
  notificationTests,
  dashboardTests,
  settingsTests,
  dataIntegrityTests,
  e2eWorkflowTests,
  systemValidationTests,
} from "./tests/index";

const router = Router();

// Combined test registry — order matches original section layout
const systemTests = [
  // === AUTHENTICATION & SECURITY TESTS ===
  ...authTests,
  // === GUEST MANAGEMENT TESTS ===
  ...guestTests,
  // === CAPSULE MANAGEMENT TESTS ===
  ...capsuleTests,
  // === FINANCIAL OPERATIONS TESTS ===
  ...financialTests,
  // === NOTIFICATION & PROBLEM TRACKING TESTS ===
  ...notificationTests,
  // === DASHBOARD & REPORTING TESTS ===
  ...dashboardTests,
  ...settingsTests,
  // === DATA INTEGRITY TESTS ===
  ...dataIntegrityTests,
  // === COMPREHENSIVE END-TO-END WORKFLOW TESTS ===
  ...e2eWorkflowTests,
  // === SYSTEM VALIDATION TESTS ===
  ...systemValidationTests,
];

router.get("/hello", (req, res) => {
  res.json({ message: "Hello from Gemini!" });
});

// Main test runner endpoint
router.post("/run", async (req, res) => {
  const watch = req.query.watch === '1';
  const startTime = Date.now();

  try {
    res.setHeader('Content-Type', 'text/plain');

    let output = `\n`;
    output += `╔══════════════════════════════════════════════════════════════════╗\n`;
    output += `║                🧪 PELANGI MANAGER SYSTEM TESTS                   ║\n`;
    output += `╠══════════════════════════════════════════════════════════════════╣\n`;
    output += `║ 📅 Started: ${new Date().toLocaleString().padEnd(32)} ║\n`;
    output += `║ 🔄 Mode: ${(watch ? 'Watch Mode' : 'Single Run').padEnd(38)} ║\n`;
    output += `║ 📊 Total Tests: ${systemTests.length.toString().padEnd(32)} ║\n`;
    output += `╚══════════════════════════════════════════════════════════════════╝\n\n`;

    let passed = 0;
    let failed = 0;
    let currentSection = '';

    // Define test sections with their starting test indices
    const sections = [
      { name: '🔐 AUTHENTICATION & SECURITY', start: 0, emoji: '🛡️' },
      { name: '👥 GUEST MANAGEMENT', start: 2, emoji: '🏨' },
      { name: '🏠 CAPSULE MANAGEMENT', start: 5, emoji: '🛏️' },
      { name: '💰 FINANCIAL OPERATIONS', start: 7, emoji: '💳' },
      { name: '📢 NOTIFICATIONS & TRACKING', start: 9, emoji: '🔔' },
      { name: '📊 DASHBOARD & REPORTING', start: 11, emoji: '📈' },
      { name: '🔍 DATA INTEGRITY', start: 13, emoji: '✅' },
      { name: '🔄 END-TO-END WORKFLOWS', start: 14, emoji: '🎯' },
      { name: '🧪 SYSTEM VALIDATION', start: 17, emoji: '⚙️' }
    ];

    for (let i = 0; i < systemTests.length; i++) {
      const test = systemTests[i];
      const testNumber = i + 1;

      // Check if we need to show a new section header
      const section = sections.find(s => s.start === i);
      if (section) {
        output += `\n┌${'─'.repeat(66)}┐\n`;
        output += `│ ${section.emoji}  ${section.name.padEnd(60)} │\n`;
        output += `└${'─'.repeat(66)}┘\n\n`;
      }

      try {
        const result = await test.test();

        if (result.passed) {
          passed++;
          output += `  ${testNumber.toString().padStart(2, '0')}. ${test.name.padEnd(45)} ✅ PASSED\n`;
          output += `      ↳ ${result.details}\n\n`;
        } else {
          failed++;
          output += `  ${testNumber.toString().padStart(2, '0')}. ${test.name.padEnd(45)} ❌ FAILED\n`;
          output += `      ↳ ${result.details}\n`;
          output += `      💡 Troubleshooting suggestions:\n`;
          test.suggestions.forEach((suggestion, idx) => {
            output += `         ${(idx + 1)}. ${suggestion}\n`;
          });
          output += `\n`;
        }
      } catch (error: any) {
        failed++;
        output += `  ${testNumber.toString().padStart(2, '0')}. ${test.name.padEnd(45)} ⚠️  ERROR\n`;
        output += `      ↳ ${error.message}\n`;
        output += `      💡 Troubleshooting suggestions:\n`;
        test.suggestions.forEach((suggestion, idx) => {
          output += `         ${(idx + 1)}. ${suggestion}\n`;
        });
        output += `\n`;
      }
    }

    const duration = Date.now() - startTime;
    const successRate = ((passed / (passed + failed)) * 100).toFixed(1);

    output += `\n┌${'─'.repeat(66)}┐\n`;
    output += `│                        📊 TEST SUMMARY                          │\n`;
    output += `├${'─'.repeat(66)}┤\n`;
    output += `│ ✅ Passed:     ${passed.toString().padStart(3)} / ${(passed + failed).toString().padEnd(3)}                              │\n`;
    output += `│ ❌ Failed:     ${failed.toString().padStart(3)} / ${(passed + failed).toString().padEnd(3)}                              │\n`;
    output += `│ 📈 Success Rate: ${successRate.padStart(5)}%                                │\n`;
    output += `│ ⏱️  Duration:    ${(duration + 'ms').padStart(8)}                             │\n`;
    output += `└${'─'.repeat(66)}┘\n`;

    if (failed === 0) {
      output += `\n🎉 EXCELLENT! All tests passed successfully!\n`;
      output += `   Your PelangiManager system is functioning correctly.\n`;
    } else {
      output += `\n⚠️  ATTENTION: ${failed} test(s) require attention.\n`;
      output += `   Review the troubleshooting suggestions above for fixes.\n`;
    }

    res.status(failed === 0 ? 200 : 400).send(output);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    let output = `\n`;
    output += `╔══════════════════════════════════════════════════════════════════╗\n`;
    output += `║                      ❌ TEST RUNNER ERROR                        ║\n`;
    output += `╚══════════════════════════════════════════════════════════════════╝\n\n`;
    output += `⚠️  Critical Error: ${error.message}\n\n`;
    output += `⏱️  Runtime Duration: ${duration}ms\n\n`;
    output += `┌─── 💡 TROUBLESHOOTING STEPS ─────────────────────────────────────┐\n`;
    output += `│ 1. Check server logs for detailed error information             │\n`;
    output += `│ 2. Verify database connection is working properly               │\n`;
    output += `│ 3. Ensure all required services are running                     │\n`;
    output += `│ 4. Restart the development server if needed                     │\n`;
    output += `└──────────────────────────────────────────────────────────────────┘\n`;

    res.status(500).send(output);
  }
});

// Health check for tests
router.get("/health", async (req, res) => {
  try {
    const capsules = await storage.getAllCapsules();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      capsulesCount: capsules.length,
      storageType: process.env.DATABASE_URL ? "database" : "memory"
    });
  } catch (error: any) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sample data population endpoint
router.post("/populate-sample-guests", async (req, res) => {
  try {
    const storageType = process.env.DATABASE_URL ? "database" : "memory";

    if (storageType === "memory") {
      return res.json({
        message: "Sample guests are automatically created in memory mode",
        action: "none_required",
        storageType: "memory"
      });
    }

    // For database mode, populate sample guests
    console.log("🎯 Populating sample guests via API...");

    // Check current guests count
    const existingGuests = await storage.getCheckedInGuests();

    if (existingGuests.data.length > 0) {
      return res.json({
        message: `${existingGuests.data.length} guests already exist`,
        action: "skipped",
        storageType: "database",
        existingCount: existingGuests.data.length
      });
    }

    // Sample guest data matching MemStorage.ts
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

    const fmtDate = (d: Date) => d.toISOString().split('T')[0];

    const sampleGuests = [
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Wei Ming", capsule: "C26", phone: "011-9876543", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "weiming.tan@outlook.com", age: 31, paymentStatus: "paid" },
      { name: "Raj", capsule: "C11", phone: "013-2468135", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Indian", gender: "male", email: "raj.patel@gmail.com", age: 27, paymentStatus: "paid" },
      { name: "Hassan", capsule: "C12", phone: "014-3579246", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "hassan.ali@yahoo.com", age: 26, paymentStatus: "paid" },
      { name: "Li Wei", capsule: "C13", phone: "015-4681357", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Chinese", gender: "male", email: "liwei.chen@hotmail.com", age: 30, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)), nights: 1, nationality: "Malaysian", gender: "female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];

    let created = 0;
    for (const guest of sampleGuests) {
      const standardRate = 45; // RM45 per night
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * 0.8) : totalAmount;

      const guestData = {
        name: guest.name,
        capsuleNumber: guest.capsule,
        checkinTime: new Date(guest.checkin),
        expectedCheckoutDate: guest.checkout,
        paymentAmount: paidAmount.toString(),
        paymentMethod: "cash" as any,
        paymentCollector: isOutstanding ? "" : "Admin",
        isPaid: !isOutstanding,
        notes: isOutstanding ? `Outstanding balance: RM${totalAmount - paidAmount}` : "",
        gender: guest.gender as any,
        nationality: guest.nationality,
        phoneNumber: guest.phone,
        email: guest.email,
        age: guest.age.toString(),
      };

      await storage.createGuest(guestData);
      created++;
    }

    console.log(`✅ Created ${created} sample guests via API`);

    res.json({
      message: `Successfully created ${created} sample guests`,
      action: "created",
      storageType: "database",
      guestsCreated: created,
      guests: sampleGuests.map(g => ({ name: g.name, capsule: g.capsule, status: g.paymentStatus }))
    });

  } catch (error: any) {
    console.error("❌ Error populating sample guests:", error);
    res.status(500).json({
      message: "Failed to populate sample guests",
      error: error.message,
      action: "failed"
    });
  }
});

// Clear and repopulate sample guests endpoint
router.post("/refresh-sample-guests", async (req, res) => {
  try {
    const storageType = process.env.DATABASE_URL ? "database" : "memory";

    if (storageType === "memory") {
      return res.json({
        message: "Sample guests are automatically managed in memory mode",
        action: "none_required",
        storageType: "memory"
      });
    }

    console.log("🔄 Refreshing sample guests (clear and repopulate)...");

    // First, clear all existing guests
    const existingGuests = await storage.getCheckedInGuests();
    console.log(`🧹 Clearing ${existingGuests.data.length} existing guests...`);

    // Clear guests from database using postgres
    const postgres = (await import('postgres')).default;
    const sql = postgres(process.env.DATABASE_URL || '');

    // Clear all guests and reset capsule availability
    await sql`DELETE FROM guests`;
    await sql`UPDATE capsules SET is_available = true`;

    await sql.end();

    console.log("✅ Cleared all existing guest data");

    // Now populate fresh sample data using the same logic as populate-sample-guests
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2);

    const fmtDate = (d: Date) => d.toISOString().split('T')[0];

    const sampleGuests = [
      { name: "Keong", capsule: "C1", phone: "017-6632979", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "keong.lim@gmail.com", age: 28, paymentStatus: "paid" },
      { name: "Prem", capsule: "C4", phone: "019-7418889", checkin: today.toISOString(), checkout: fmtDate(today), nights: 1, nationality: "Malaysian", gender: "male", email: "prem.kumar@yahoo.com", age: 32, paymentStatus: "paid" },
      { name: "Jeevan", capsule: "C5", phone: "010-5218906", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "jeevan.singh@hotmail.com", age: 25, paymentStatus: "paid" },
      { name: "Ahmad", capsule: "C25", phone: "012-3456789", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "ahmad.ibrahim@gmail.com", age: 29, paymentStatus: "outstanding" },
      { name: "Wei Ming", capsule: "C26", phone: "011-9876543", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Malaysian", gender: "male", email: "weiming.tan@outlook.com", age: 31, paymentStatus: "paid" },
      { name: "Raj", capsule: "C11", phone: "013-2468135", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Indian", gender: "male", email: "raj.patel@gmail.com", age: 27, paymentStatus: "paid" },
      { name: "Hassan", capsule: "C12", phone: "014-3579246", checkin: today.toISOString(), checkout: fmtDate(tomorrow), nights: 1, nationality: "Malaysian", gender: "male", email: "hassan.ali@yahoo.com", age: 26, paymentStatus: "paid" },
      { name: "Li Wei", capsule: "C13", phone: "015-4681357", checkin: today.toISOString(), checkout: fmtDate(dayAfter), nights: 2, nationality: "Chinese", gender: "male", email: "liwei.chen@hotmail.com", age: 30, paymentStatus: "outstanding" },
      { name: "Siti", capsule: "C6", phone: "016-1234567", checkin: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), checkout: fmtDate(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)), nights: 1, nationality: "Malaysian", gender: "female", email: "siti.rahman@gmail.com", age: 24, paymentStatus: "outstanding" },
    ];

    let created = 0;
    for (const guest of sampleGuests) {
      const standardRate = 45; // RM45 per night
      const totalAmount = guest.nights * standardRate;
      const isOutstanding = guest.paymentStatus === "outstanding";
      const paidAmount = isOutstanding ? Math.floor(totalAmount * 0.8) : totalAmount;

      const guestData = {
        name: guest.name,
        capsuleNumber: guest.capsule,
        checkinTime: new Date(guest.checkin),
        expectedCheckoutDate: guest.checkout,
        paymentAmount: paidAmount.toString(),
        paymentMethod: "cash" as any,
        paymentCollector: isOutstanding ? "" : "Admin",
        isPaid: !isOutstanding,
        notes: isOutstanding ? `Outstanding balance: RM${totalAmount - paidAmount}` : "",
        gender: guest.gender as any,
        nationality: guest.nationality,
        phoneNumber: guest.phone,
        email: guest.email,
        age: guest.age.toString(),
      };

      await storage.createGuest(guestData);
      created++;
    }

    console.log(`✅ Refreshed with ${created} fresh sample guests`);

    res.json({
      message: `Successfully refreshed with ${created} fresh sample guests`,
      action: "refreshed",
      storageType: "database",
      guestsCleared: existingGuests.data.length,
      guestsCreated: created,
      guests: sampleGuests.map(g => ({ name: g.name, capsule: g.capsule, status: g.paymentStatus }))
    });

  } catch (error: any) {
    console.error("❌ Error refreshing sample guests:", error);
    res.status(500).json({
      message: "Failed to refresh sample guests",
      error: error.message,
      action: "failed"
    });
  }
});

export default router;
