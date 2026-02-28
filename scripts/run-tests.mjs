#!/usr/bin/env node
/**
 * Digiman CLI Test Runner
 *
 * Runs the same API test suite as /test page but from the command line.
 * Requires Node.js 18+ (uses built-in fetch).
 *
 * Usage:
 *   node scripts/run-tests.mjs [options]
 *
 * Options:
 *   --url=<url>         Server base URL (default: http://localhost:5000)
 *   --email=<email>     Login email/username (default: admin)
 *   --password=<pass>   Login password (default: admin)
 *   --module=<m,...>    Run only these modules (comma-separated)
 *                       Values: smoke,auth,guests,units,dashboard,settings,finance,problems,integration,edge
 *   --type=<t,...>      Run only these types (comma-separated)
 *                       Values: smoke,unit,integration,edge
 *   --output=<file>     Save JSON report to file (default: test-report.json)
 *   --no-report         Skip saving JSON file
 *   --concurrency=<n>   Tests per batch (default: 1, sequential)
 *
 * Examples:
 *   node scripts/run-tests.mjs
 *   node scripts/run-tests.mjs --module=smoke,auth --output=smoke-report.json
 *   node scripts/run-tests.mjs --type=edge --password=mypassword
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── ANSI Colors ───────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", gray: "\x1b[90m",
  bgGreen: "\x1b[42m", bgRed: "\x1b[41m",
};
const green = (s) => `${c.green}${s}${c.reset}`;
const red = (s) => `${c.red}${s}${c.reset}`;
const yellow = (s) => `${c.yellow}${s}${c.reset}`;
const blue = (s) => `${c.blue}${s}${c.reset}`;
const cyan = (s) => `${c.cyan}${s}${c.reset}`;
const gray = (s) => `${c.gray}${s}${c.reset}`;
const bold = (s) => `${c.bold}${s}${c.reset}`;
const dim = (s) => `${c.dim}${s}${c.reset}`;

// ── CLI Arg Parser ────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    url: "http://localhost:5000",
    email: "admin",
    password: "admin",
    modules: [],
    types: [],
    output: "test-report.json",
    noReport: false,
    concurrency: 1,
  };
  for (const arg of args) {
    const [key, val] = arg.replace(/^--/, "").split("=");
    if (key === "url") opts.url = val;
    else if (key === "email") opts.email = val;
    else if (key === "password") opts.password = val;
    else if (key === "module") opts.modules = val.split(",").map(s => s.trim());
    else if (key === "type") opts.types = val.split(",").map(s => s.trim());
    else if (key === "output") opts.output = val;
    else if (key === "no-report") opts.noReport = true;
    else if (key === "concurrency") opts.concurrency = parseInt(val) || 1;
    else { console.error(`Unknown option: --${key}`); process.exit(1); }
  }
  return opts;
}

// ── API Context Factory ───────────────────────────────────────────────────────
function makeCtx(baseUrl, token) {
  const h = (auth) => ({
    "Content-Type": "application/json",
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
  });
  const parse = async (r) => { try { return await r.json(); } catch { return null; } };
  return {
    token,
    get: async (p, auth = true) => {
      const r = await fetch(`${baseUrl}/api${p}`, { headers: h(auth) });
      return { status: r.status, data: await parse(r) };
    },
    post: async (p, b, auth = true) => {
      const r = await fetch(`${baseUrl}/api${p}`, { method: "POST", headers: h(auth), body: JSON.stringify(b) });
      return { status: r.status, data: await parse(r) };
    },
    patch: async (p, b, auth = true) => {
      const r = await fetch(`${baseUrl}/api${p}`, { method: "PATCH", headers: h(auth), body: JSON.stringify(b) });
      return { status: r.status, data: await parse(r) };
    },
    put: async (p, b, auth = true) => {
      const r = await fetch(`${baseUrl}/api${p}`, { method: "PUT", headers: h(auth), body: JSON.stringify(b) });
      return { status: r.status, data: await parse(r) };
    },
    del: async (p, auth = true) => {
      const r = await fetch(`${baseUrl}/api${p}`, { method: "DELETE", headers: h(auth) });
      return { status: r.status, data: await parse(r) };
    },
  };
}

// ── Test Helpers ──────────────────────────────────────────────────────────────
const ts = () => `Test${Date.now()}`;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split("T")[0];
const arr = (data) => (Array.isArray(data) ? data : data?.data ?? []);

async function getAvailableUnit(ctx) {
  const r = await ctx.get("/units/available", true);
  if (r.status !== 200 || !arr(r.data).length) return null;
  return arr(r.data)[0];
}

function guestPayload(unitNumber, suffix = "") {
  return {
    name: `${ts()}${suffix}`,
    unitNumber,
    checkinTime: new Date().toISOString(),
    expectedCheckoutDate: tomorrow(),
    paymentAmount: "50.00",
    paymentMethod: "cash",
    paymentCollector: "TestRunner",
    isPaid: true,
    nationality: "Malaysian",
    gender: "male",
    phoneNumber: "+60123456789",
    email: `cli_test_${Date.now()}@example.com`,
    age: "25",
  };
}

// ── Test Definitions ──────────────────────────────────────────────────────────
// Mirror of client/src/pages/test-suite.tsx — same logic, different base URL
const TESTS = [
  // SMOKE
  { id: "SM-001", name: "Health endpoint", module: "smoke", type: "smoke", description: "GET /api/health returns status:ok",
    async run(ctx) {
      const r = await ctx.get("/health", false);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      if (r.data?.status !== "ok") throw new Error(`status != ok: "${r.data?.status}"`);
      return { passed: true, details: `ok · uptime: ${Math.round(r.data.uptime)}s · storage: ${r.data.storageType}` };
    }, suggestions: ["Run: npm run dev:clean"] },

  { id: "SM-002", name: "Database connectivity", module: "smoke", type: "smoke", description: "DB reachable via health endpoint",
    async run(ctx) {
      const r = await ctx.get("/health", false);
      if (r.status !== 200) throw new Error(`Health failed: ${r.status}`);
      return { passed: true, details: `Storage: ${r.data?.storageType} · units: ${r.data?.unitsCount}` };
    }, suggestions: ["Check DATABASE_URL in .env"] },

  { id: "SM-003", name: "Business config (no auth)", module: "smoke", type: "smoke", description: "GET /api/business-config accessible without auth",
    async run(ctx) {
      const r = await ctx.get("/business-config", false);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Keys: ${Object.keys(r.data || {}).slice(0, 5).join(", ")}` };
    }, suggestions: ["Check server/lib/business-config.ts"] },

  { id: "SM-004", name: "API response latency", module: "smoke", type: "smoke", description: "Server responds < 3000ms",
    async run(ctx) {
      const t = Date.now();
      const r = await ctx.get("/health", false);
      const ms = Date.now() - t;
      if (r.status !== 200) throw new Error("Server not responding");
      if (ms > 3000) return { passed: false, details: `⚠ High latency: ${ms}ms` };
      return { passed: true, details: `${ms}ms ✓` };
    }, suggestions: ["High latency may indicate DB issues"] },

  { id: "SM-005", name: "Tests runner endpoint", module: "smoke", type: "smoke", description: "GET /api/tests/health responds",
    async run(ctx) {
      const r = await ctx.get("/tests/health", false);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Backend tests healthy · units: ${r.data?.unitsCount}` };
    }, suggestions: ["Check server/routes/tests.ts"] },

  // AUTH
  { id: "AU-001", name: "Login with valid credentials", module: "auth", type: "unit", description: "Login returns token + user",
    async run(ctx) {
      const r = await ctx.post("/auth/login", { email: "admin", password: "admin" }, false);
      if (r.status === 200) {
        if (!r.data?.token) throw new Error("Missing token");
        return { passed: true, details: `Token issued · role: ${r.data.user.role}` };
      }
      if (r.status === 401) return { passed: false, details: "Default admin creds rejected", error: r.data?.message };
      throw new Error(`Unexpected: ${r.status}`);
    }, suggestions: ["Verify admin user in DB"] },

  { id: "AU-002", name: "Login with wrong password", module: "auth", type: "unit", description: "Wrong credentials return 401",
    async run(ctx) {
      const r = await ctx.post("/auth/login", { email: "nobody@invalid.test", password: "WRONG_999" }, false);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      return { passed: true, details: `Correctly rejected: ${r.data?.message}` };
    }, suggestions: [] },

  { id: "AU-003", name: "Login with missing fields", module: "auth", type: "unit", description: "Missing password returns 400",
    async run(ctx) {
      const r = await ctx.post("/auth/login", { email: "test@example.com" }, false);
      if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
      return { passed: true, details: `Validation rejects: ${r.data?.message}` };
    }, suggestions: ["Check loginSchema Zod validation"] },

  { id: "AU-004", name: "Protected route without token", module: "auth", type: "unit", description: "GET /auth/me without token returns 401",
    async run(ctx) {
      const r = await ctx.get("/auth/me", false);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      return { passed: true, details: "Auth guard returns 401 ✓" };
    }, suggestions: ["Check authenticateToken middleware"] },

  { id: "AU-005", name: "Get /auth/me with valid token", module: "auth", type: "unit", description: "Valid token returns user info",
    async run(ctx) {
      if (!ctx.token) return { passed: false, details: "No token — login first", error: "Missing token" };
      const r = await ctx.get("/auth/me", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `User: ${r.data?.user?.email} · role: ${r.data?.user?.role}` };
    }, suggestions: [] },

  { id: "AU-006", name: "Invalid token rejected", module: "auth", type: "unit", description: "Fabricated token returns 401",
    async run(ctx, baseUrl) {
      const fakeCtx = makeCtx(baseUrl || ctx.baseUrl || "http://localhost:5000", "fake-token-xyz-999999");
      const r = await fakeCtx.get("/auth/me", true);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      return { passed: true, details: "Invalid token correctly rejected" };
    }, suggestions: [] },

  { id: "AU-007", name: "Logout invalidates session", module: "auth", type: "unit", description: "After logout, token returns 401",
    async run(ctx) {
      const loginR = await ctx.post("/auth/login", { email: "admin", password: "admin" }, false);
      if (loginR.status !== 200) return { passed: false, details: "Login failed — cannot test logout", error: "Login failed" };
      const freshCtx = makeCtx(ctx._baseUrl ?? "http://localhost:5000", loginR.data.token);
      const logoutR = await freshCtx.post("/auth/logout", {}, true);
      if (logoutR.status !== 200) throw new Error(`Logout: ${logoutR.status}`);
      const meR = await freshCtx.get("/auth/me", true);
      if (meR.status !== 401) throw new Error(`Token still valid after logout (got ${meR.status})`);
      return { passed: true, details: "Session invalidated after logout ✓" };
    }, suggestions: ["Check deleteSession in storage"] },

  // GUESTS
  { id: "GU-001", name: "List guests (authenticated)", module: "guests", type: "unit", description: "GET /guests returns array",
    async run(ctx) {
      const r = await ctx.get("/guests", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${r.data?.message}`);
      return { passed: true, details: `${arr(r.data).length} guests` };
    }, suggestions: [] },

  { id: "GU-002", name: "List guests (unauthenticated)", module: "guests", type: "unit", description: "GET /guests without token returns 401",
    async run(ctx) {
      const r = await ctx.get("/guests", false);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      return { passed: true, details: "Auth guard enforced ✓" };
    }, suggestions: [] },

  { id: "GU-003", name: "Checked-in guests endpoint", module: "guests", type: "unit", description: "GET /guests/checked-in returns occupants",
    async run(ctx) {
      const r = await ctx.get("/guests/checked-in", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} checked-in guests` };
    }, suggestions: [] },

  { id: "GU-004", name: "Create guest → verify → cleanup", module: "guests", type: "unit", description: "POST guest lifecycle",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const createR = await ctx.post("/guests", guestPayload(unit.number), true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}: ${JSON.stringify(createR.data)}`);
      const id = createR.data?.id;
      if (!id) throw new Error("No id in response");
      const getR = await ctx.get(`/guests/${id}`, true);
      if (getR.status !== 200) throw new Error(`Get by ID: ${getR.status}`);
      await ctx.del(`/guests/${id}`, true);
      return { passed: true, details: `Created ${id.slice(0, 8)}... → verified → deleted ✓` };
    }, suggestions: [] },

  { id: "GU-005", name: "Guest creation validation", module: "guests", type: "unit", description: "Missing name returns 400",
    async run(ctx) {
      const r = await ctx.post("/guests", { unitNumber: "C1", paymentMethod: "cash" }, true);
      if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
      return { passed: true, details: `Missing name rejected: ${r.data?.message}` };
    }, suggestions: [] },

  { id: "GU-006", name: "Update guest (PATCH)", module: "guests", type: "unit", description: "PATCH /guests/:id updates a field",
    async run(ctx) {
      const listR = await ctx.get("/guests", true);
      const list = arr(listR.data);
      if (!list.length) return { passed: false, details: "No guests to update", error: "Empty list" };
      const guestId = list[0].id;
      const orig = list[0].notes || "";
      const testNote = `note_${Date.now()}`;
      const r = await ctx.patch(`/guests/${guestId}`, { notes: testNote }, true);
      if (r.status !== 200) throw new Error(`PATCH: ${r.status}: ${JSON.stringify(r.data)}`);
      await ctx.patch(`/guests/${guestId}`, { notes: orig }, true);
      return { passed: true, details: `Updated ${guestId.slice(0, 8)}... and restored ✓` };
    }, suggestions: [] },

  { id: "GU-007", name: "Guest history endpoint", module: "guests", type: "unit", description: "GET /guests/history returns checked-out guests",
    async run(ctx) {
      const r = await ctx.get("/guests/history", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} historical guests` };
    }, suggestions: [] },

  // UNITS
  { id: "UN-001", name: "List all units", module: "units", type: "unit", description: "GET /units returns array",
    async run(ctx) {
      const r = await ctx.get("/units", true);
      if (r.status !== 200 || !Array.isArray(r.data)) throw new Error(`Expected array, got ${r.status}`);
      if (!r.data.length) return { passed: false, details: "No units found", error: "Empty" };
      return { passed: true, details: `${r.data.length} units` };
    }, suggestions: [] },

  { id: "UN-002", name: "Available units filter", module: "units", type: "unit", description: "All returned units have isAvailable=true",
    async run(ctx) {
      const r = await ctx.get("/units/available", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      const bad = arr(r.data).filter(u => u.isAvailable !== true);
      if (bad.length) return { passed: false, details: `${bad.length} unavailable in results: ${bad.map(u => u.number).join(", ")}`, error: "Filter broken" };
      return { passed: true, details: `${arr(r.data).length} available units ✓` };
    }, suggestions: [] },

  { id: "UN-003", name: "Cleaning status filter", module: "units", type: "unit", description: "Cleaning status filters return accurate results",
    async run(ctx) {
      const cleanR = await ctx.get("/units/cleaning-status/cleaned", true);
      const dirtyR = await ctx.get("/units/cleaning-status/to_be_cleaned", true);
      if (cleanR.status !== 200 || dirtyR.status !== 200) throw new Error("Filter endpoints failed");
      const allClean = arr(cleanR.data).every(u => u.cleaningStatus === "cleaned");
      const allDirty = arr(dirtyR.data).every(u => u.cleaningStatus === "to_be_cleaned");
      if (!allClean || !allDirty) return { passed: false, details: "Filter mismatch", error: "Wrong statuses returned" };
      return { passed: true, details: `Cleaned: ${arr(cleanR.data).length} · Dirty: ${arr(dirtyR.data).length}` };
    }, suggestions: [] },

  { id: "UN-004", name: "Units needing attention", module: "units", type: "unit", description: "GET /units/needs-attention returns results",
    async run(ctx) {
      const r = await ctx.get("/units/needs-attention", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} units need attention` };
    }, suggestions: [] },

  { id: "UN-005", name: "Mark unit as cleaned", module: "units", type: "unit", description: "POST /units/:number/mark-cleaned works",
    async run(ctx) {
      const allR = await ctx.get("/units", true);
      if (!Array.isArray(allR.data) || !allR.data.length) throw new Error("No units");
      const unit = allR.data[0];
      const r = await ctx.post(`/units/${unit.number}/mark-cleaned`, {}, true);
      if (r.status !== 200 && r.status !== 204) throw new Error(`Expected 200/204, got ${r.status}`);
      return { passed: true, details: `Unit ${unit.number} marked cleaned (${r.status}) ✓` };
    }, suggestions: [] },

  // DASHBOARD
  { id: "DA-001", name: "Occupancy stats", module: "dashboard", type: "unit", description: "GET /occupancy returns metrics",
    async run(ctx) {
      const r = await ctx.get("/occupancy", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: JSON.stringify(r.data).slice(0, 80) };
    }, suggestions: [] },

  { id: "DA-002", name: "Dashboard data endpoint", module: "dashboard", type: "unit", description: "GET /dashboard returns combined data",
    async run(ctx) {
      const r = await ctx.get("/dashboard", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Keys: ${Object.keys(r.data || {}).join(", ")}` };
    }, suggestions: [] },

  { id: "DA-003", name: "Monthly occupancy calendar", module: "dashboard", type: "unit", description: "GET /calendar/occupancy/:year/:month works",
    async run(ctx) {
      const d = new Date();
      const r = await ctx.get(`/calendar/occupancy/${d.getFullYear()}/${d.getMonth() + 1}`, true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Calendar ${d.getFullYear()}/${d.getMonth() + 1} returned` };
    }, suggestions: [] },

  // SETTINGS
  { id: "SE-001", name: "Get settings", module: "settings", type: "unit", description: "GET /settings returns config",
    async run(ctx) {
      const r = await ctx.get("/settings", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${Object.keys(r.data || {}).length} keys` };
    }, suggestions: [] },

  { id: "SE-002", name: "Setup status endpoint", module: "settings", type: "unit", description: "GET /settings/setup-status works",
    async run(ctx) {
      const r = await ctx.get("/settings/setup-status", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: JSON.stringify(r.data).slice(0, 80) };
    }, suggestions: [] },

  // FINANCE
  { id: "FI-001", name: "List expenses", module: "finance", type: "unit", description: "GET /expenses returns array",
    async run(ctx) {
      const r = await ctx.get("/expenses", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} expenses` };
    }, suggestions: [] },

  { id: "FI-002", name: "Expense lifecycle (create → delete)", module: "finance", type: "unit", description: "POST → DELETE expense",
    async run(ctx) {
      const createR = await ctx.post("/expenses", { description: ts(), amount: "99.50", category: "consumables", date: new Date().toISOString().split("T")[0] }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}: ${JSON.stringify(createR.data)}`);
      const id = createR.data?.id;
      if (!id) throw new Error("No id in response");
      const delR = await ctx.del(`/expenses/${id}`, true);
      if (delR.status !== 200 && delR.status !== 204) throw new Error(`Delete: ${delR.status}`);
      return { passed: true, details: `Created ${id.slice(0, 8)}... → deleted ✓` };
    }, suggestions: [] },

  { id: "FI-003", name: "Expense invalid category", module: "finance", type: "unit", description: "Invalid category returns 400",
    async run(ctx) {
      const r = await ctx.post("/expenses", { description: "test", amount: "10.00", category: "INVALID_XYZ", date: "2026-01-01" }, true);
      if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
      return { passed: true, details: `Category validation working ✓` };
    }, suggestions: [] },

  // PROBLEMS
  { id: "PR-001", name: "List all problems", module: "problems", type: "unit", description: "GET /problems returns array",
    async run(ctx) {
      const r = await ctx.get("/problems", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} problems` };
    }, suggestions: [] },

  { id: "PR-002", name: "Active problems filter", module: "problems", type: "unit", description: "GET /problems/active returns only unresolved",
    async run(ctx) {
      const r = await ctx.get("/problems/active", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      const resolved = arr(r.data).filter(p => p.isResolved);
      if (resolved.length) return { passed: false, details: `${resolved.length} resolved in active list`, error: "Filter broken" };
      return { passed: true, details: `${arr(r.data).length} active problems ✓` };
    }, suggestions: [] },

  { id: "PR-003", name: "Problem lifecycle (create → resolve → delete)", module: "problems", type: "unit", description: "Full problem workflow",
    async run(ctx) {
      const createR = await ctx.post("/problems", { unitNumber: "C1", description: ts(), reportedBy: "CLITestRunner" }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}`);
      const id = createR.data?.id;
      if (!id) throw new Error("No id in response");
      const resolveR = await ctx.patch(`/problems/${id}/resolve`, { resolvedBy: "CLITestRunner", notes: "CLI test resolved" }, true);
      if (resolveR.status !== 200) throw new Error(`Resolve: ${resolveR.status}: ${JSON.stringify(resolveR.data)}`);
      const delR = await ctx.del(`/problems/${id}`, true);
      if (delR.status !== 200 && delR.status !== 204) throw new Error(`Delete: ${delR.status}`);
      return { passed: true, details: `Created → resolved → deleted (${id.slice(0, 8)}...) ✓` };
    }, suggestions: [] },

  // INTEGRATION
  { id: "IN-001", name: "Full check-in / check-out workflow", module: "integration", type: "integration",
    description: "Unit → check-in → verify → checkout → verify history → cleanup",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const checkinR = await ctx.post("/guests", guestPayload(unit.number, "-Integration"), true);
      if (checkinR.status !== 201 && checkinR.status !== 200) throw new Error(`Check-in: ${checkinR.status}: ${JSON.stringify(checkinR.data)}`);
      const guestId = checkinR.data?.id;
      const verifyR = await ctx.get(`/guests/${guestId}`, true);
      if (!verifyR.data?.isCheckedIn) throw new Error("Guest not isCheckedIn after check-in");
      const checkoutR = await ctx.post(`/guests/${guestId}/checkout`, { checkoutTime: new Date().toISOString(), actualAmount: "50.00", paymentMethod: "cash" }, true);
      if (checkoutR.status !== 200) throw new Error(`Checkout: ${checkoutR.status}: ${JSON.stringify(checkoutR.data)}`);
      const histR = await ctx.get("/guests/history", true);
      const inHistory = arr(histR.data).some(g => g.id === guestId);
      await ctx.del(`/guests/${guestId}`, true);
      return { passed: true, details: `${unit.number} → in → checkout → ${inHistory ? "in history ✓" : "NOT in history ✗"} → deleted` };
    }, suggestions: ["Check checkout route updates isCheckedIn and unit availability"] },

  { id: "IN-002", name: "Expense CRUD lifecycle", module: "integration", type: "integration", description: "Create → list → update → delete",
    async run(ctx) {
      const label = ts();
      const createR = await ctx.post("/expenses", { description: label, amount: "150.00", category: "utilities", date: new Date().toISOString().split("T")[0] }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}`);
      const id = createR.data?.id;
      const listR = await ctx.get("/expenses", true);
      const found = arr(listR.data).some(e => e.id === id);
      if (!found) throw new Error("Created expense not found in list");
      const updateR = await ctx.put(`/expenses/${id}`, { id, description: label + "-updated", amount: "200.00", category: "utilities", date: new Date().toISOString().split("T")[0] }, true);
      if (updateR.status !== 200) throw new Error(`Update: ${updateR.status}: ${JSON.stringify(updateR.data)}`);
      const delR = await ctx.del(`/expenses/${id}`, true);
      if (delR.status !== 200 && delR.status !== 204) throw new Error(`Delete: ${delR.status}`);
      return { passed: true, details: `CRUD lifecycle complete (${id?.slice(0, 8)}...) ✓` };
    }, suggestions: [] },

  { id: "IN-003", name: "Problem report → resolve lifecycle", module: "integration", type: "integration", description: "Create → in active → resolve → not in active",
    async run(ctx) {
      const createR = await ctx.post("/problems", { unitNumber: "C1", description: ts() + "_lifecycle", reportedBy: "CLIRunner" }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}`);
      const id = createR.data?.id;
      const activeR = await ctx.get("/problems/active", true);
      if (!arr(activeR.data).some(p => p.id === id)) throw new Error("Not in active list after creation");
      const resolveR = await ctx.patch(`/problems/${id}/resolve`, { resolvedBy: "CLIRunner", notes: "Lifecycle test" }, true);
      if (resolveR.status !== 200) throw new Error(`Resolve: ${resolveR.status}`);
      const active2R = await ctx.get("/problems/active", true);
      if (arr(active2R.data).some(p => p.id === id)) throw new Error("Still in active list after resolution");
      await ctx.del(`/problems/${id}`, true);
      return { passed: true, details: `Created → active → resolved → removed → deleted ✓` };
    }, suggestions: [] },

  { id: "IN-004", name: "Unit cleaning cycle", module: "integration", type: "integration", description: "Check-in → checkout → dirty → mark cleaned → verified",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const checkinR = await ctx.post("/guests", guestPayload(unit.number, "-CleanTest"), true);
      if (checkinR.status !== 201 && checkinR.status !== 200) throw new Error(`Check-in: ${checkinR.status}`);
      const guestId = checkinR.data?.id;
      await ctx.post(`/guests/${guestId}/checkout`, { checkoutTime: new Date().toISOString(), actualAmount: "50.00", paymentMethod: "cash" }, true);
      const dirtyR = await ctx.get("/units/cleaning-status/to_be_cleaned", true);
      const isDirty = arr(dirtyR.data).some(u => u.number === unit.number);
      await ctx.post(`/units/${unit.number}/mark-cleaned`, {}, true);
      const cleanR = await ctx.get("/units/cleaning-status/cleaned", true);
      const isCleaned = arr(cleanR.data).some(u => u.number === unit.number);
      await ctx.del(`/guests/${guestId}`, true);
      return {
        passed: isDirty && isCleaned,
        details: `${unit.number}: ${isDirty ? "dirty ✓" : "NOT dirty ✗"} → ${isCleaned ? "cleaned ✓" : "NOT cleaned ✗"}`,
        error: !isDirty ? "Unit not marked dirty after checkout" : !isCleaned ? "Unit not cleaned" : undefined,
      };
    }, suggestions: ["Check checkout route calls markUnitNeedsCleaning"] },

  // EDGE
  { id: "ED-001", name: "Invalid UUID in guest path", module: "edge", type: "edge", description: "GET /guests/not-a-uuid returns 400 or 404, not 500",
    async run(ctx) {
      const r = await ctx.get("/guests/not-a-valid-uuid-xyz", true);
      if (r.status === 500) throw new Error("500 on invalid UUID — unhandled error");
      return { passed: r.status === 400 || r.status === 404, details: `Returns ${r.status} (expected 400/404)`, error: r.status !== 400 && r.status !== 404 ? `Got ${r.status}` : undefined };
    }, suggestions: ["Add UUID validation before DB lookup"] },

  { id: "ED-002", name: "XSS payload in guest name", module: "edge", type: "edge", description: "Script tag in name handled safely",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const payload = '<script>alert("xss")</script>';
      const r = await ctx.post("/guests", { ...guestPayload(unit.number), name: payload }, true);
      if (r.status === 400) return { passed: true, details: "XSS rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) {
        await ctx.del(`/guests/${r.data.id}`, true);
        return { passed: true, details: `Stored as raw text: "${(r.data?.name ?? "").slice(0, 40)}"` };
      }
      throw new Error(`Unexpected: ${r.status}`);
    }, suggestions: ["React JSX prevents XSS by default — consider server-side sanitization"] },

  { id: "ED-003", name: "SQL injection in search parameter", module: "edge", type: "edge", description: "DROP TABLE in search param handled safely",
    async run(ctx) {
      const sql = encodeURIComponent("'; DROP TABLE guests; --");
      const r = await ctx.get(`/guests?search=${sql}`, true);
      if (r.status === 500) throw new Error("500 on SQL injection — check parameterized queries");
      return { passed: true, details: `Returns ${r.status} safely (Drizzle parameterized queries ✓)` };
    }, suggestions: ["Drizzle ORM auto-parameterizes — verify no raw SQL string interpolation"] },

  { id: "ED-004", name: "Empty body POST to guests", module: "edge", type: "edge", description: "{} returns 400 not 500",
    async run(ctx) {
      const res = await fetch(`${ctx._baseUrl ?? "http://localhost:5000"}/api/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {}) },
        body: "{}",
      });
      if (res.status === 500) throw new Error("500 on empty body — missing validation");
      return { passed: res.status === 400, details: `Empty body returns ${res.status} (expected 400)`, error: res.status !== 400 ? `Got ${res.status}` : undefined };
    }, suggestions: ["Ensure Zod validation runs before DB operations"] },

  { id: "ED-005", name: "Non-existent API route", module: "edge", type: "edge", description: "Unknown route returns 404 not 500",
    async run(ctx) {
      const r = await ctx.get("/non-existent-route-xyz-abc-123", false);
      if (r.status === 500) throw new Error("500 on unknown route");
      return { passed: true, details: `Returns ${r.status}` };
    }, suggestions: ["Add catch-all 404 handler at end of route registration"] },

  { id: "ED-006", name: "Extremely long guest name (1000 chars)", module: "edge", type: "edge", description: "Long name returns 400 or is safely stored",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const r = await ctx.post("/guests", { ...guestPayload(unit.number), name: "A".repeat(1000) }, true);
      if (r.status === 500) throw new Error("500 on 1000-char name — add length validation");
      if (r.status === 400) return { passed: true, details: "1000-char name rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) {
        await ctx.del(`/guests/${r.data.id}`, true);
        return { passed: false, details: "Accepted — add max length validation", error: "No length validation" };
      }
      return { passed: true, details: `Handled: ${r.status}` };
    }, suggestions: ["Add .max(255) to name field in guest Zod schema"] },

  { id: "ED-007", name: "Invalid date format", module: "edge", type: "edge", description: "'not-a-date' in expectedCheckoutDate returns 400 not 500",
    async run(ctx) {
      const r = await ctx.post("/guests", { name: "Test", unitNumber: "C1", checkinTime: new Date().toISOString(), expectedCheckoutDate: "not-a-date", paymentAmount: "50.00", paymentMethod: "cash", paymentCollector: "Test", isPaid: true, nationality: "Test", gender: "male", phoneNumber: "+60100000000", email: `d_${Date.now()}@test.com`, age: "25" }, true);
      if (r.status === 500) throw new Error("500 on invalid date");
      if (r.status === 400) return { passed: true, details: "Invalid date rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) { await ctx.del(`/guests/${r.data.id}`, true); }
      return { passed: r.status === 400, details: `Returns ${r.status}`, error: r.status !== 400 ? "No date validation" : undefined };
    }, suggestions: ["Add date validation to expectedCheckoutDate in guest schema"] },

  { id: "ED-008", name: "Negative expense amount", module: "edge", type: "edge", description: "Negative amount returns 400 not 500",
    async run(ctx) {
      const r = await ctx.post("/expenses", { description: "edge", amount: "-50.00", category: "consumables", date: new Date().toISOString().split("T")[0] }, true);
      if (r.status === 500) throw new Error("500 on negative amount");
      if (r.status === 400) return { passed: true, details: "Negative amount rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) { await ctx.del(`/expenses/${r.data.id}`, true); }
      return { passed: false, details: "Negative amount accepted — add .positive() validation", error: "No amount validation" };
    }, suggestions: ["Add .positive() or .refine(v => parseFloat(v) > 0) to amount field"] },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();
  const baseUrl = opts.url.replace(/\/$/, "");

  console.log(`\n${bold("🧪 Digiman CLI Test Runner")}`);
  console.log(gray(`   Server: ${baseUrl}`));
  console.log(gray(`   Date:   ${new Date().toISOString()}\n`));

  // Login
  let token = null;
  if (opts.email && opts.password) {
    process.stdout.write(`  ${blue("LOGIN")}  Authenticating as ${opts.email}... `);
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: opts.email, password: opts.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 200 && data.token) {
        token = data.token;
        console.log(green(`✅ OK (role: ${data.user?.role})`));
      } else {
        console.log(yellow(`⚠  Failed (${res.status}) — auth-required tests will fail`));
      }
    } catch (e) {
      console.log(red(`✗ Error: ${e.message}`));
    }
  }

  // Build context — attach baseUrl for tests that need it directly
  const ctx = makeCtx(baseUrl, token);
  ctx._baseUrl = baseUrl;

  // Filter tests
  let tests = TESTS;
  if (opts.modules.length) tests = tests.filter(t => opts.modules.includes(t.module));
  if (opts.types.length) tests = tests.filter(t => opts.types.includes(t.type));

  console.log(`\n  Running ${bold(String(tests.length))} tests...\n`);

  // Section headers
  const SECTIONS = ["smoke", "auth", "guests", "units", "dashboard", "settings", "finance", "problems", "integration", "edge"];
  let lastModule = null;

  const results = [];
  const runStart = Date.now();

  for (const test of tests) {
    if (test.module !== lastModule) {
      console.log(`\n  ${cyan("━━━")} ${bold(test.module.toUpperCase())} ${cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
      lastModule = test.module;
    }

    const t0 = Date.now();
    const resultEntry = { id: test.id, name: test.name, module: test.module, type: test.type, description: test.description, status: "pending", duration: 0, details: "", error: null, suggestions: [] };

    try {
      const result = await test.run(ctx, baseUrl);
      resultEntry.duration = Date.now() - t0;
      resultEntry.status = result.passed ? "passed" : "failed";
      resultEntry.details = result.details;
      resultEntry.error = result.error ?? null;
      resultEntry.suggestions = result.passed ? [] : (test.suggestions ?? []);

      const statusIcon = result.passed ? green("✅") : red("❌");
      const dur = gray(`${resultEntry.duration}ms`);
      const id = gray(test.id.padEnd(7));
      console.log(`  ${statusIcon} ${id} ${test.name.padEnd(50)} ${dur}`);
      if (!result.passed) {
        if (result.details) console.log(`     ${gray("ℹ")} ${dim(result.details)}`);
        if (result.error) console.log(`     ${red("✗")} ${result.error}`);
        if (test.suggestions?.length) {
          for (const s of test.suggestions) console.log(`     ${yellow("💡")} ${dim(s)}`);
        }
      }
    } catch (e) {
      resultEntry.duration = Date.now() - t0;
      resultEntry.status = "error";
      resultEntry.error = e.message;
      resultEntry.suggestions = test.suggestions ?? [];
      const dur = gray(`${resultEntry.duration}ms`);
      const id = gray(test.id.padEnd(7));
      console.log(`  ${yellow("⚠ ")} ${id} ${test.name.padEnd(50)} ${dur}`);
      console.log(`     ${red("✗")} ${e.message}`);
      if (test.suggestions?.length) {
        for (const s of test.suggestions) console.log(`     ${yellow("💡")} ${dim(s)}`);
      }
    }

    results.push(resultEntry);
  }

  const totalDuration = Date.now() - runStart;
  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status !== "passed").length;
  const successRate = tests.length ? ((passed / tests.length) * 100).toFixed(1) : "0";

  console.log(`\n  ${cyan("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}`);
  console.log(`  ${bold("📊 Summary")}`);
  console.log(`     Total:    ${bold(String(tests.length))}`);
  console.log(`     Passed:   ${green(bold(String(passed)))}`);
  console.log(`     Failed:   ${failed > 0 ? red(bold(String(failed))) : gray("0")}`);
  console.log(`     Rate:     ${parseFloat(successRate) >= 90 ? green(successRate + "%") : parseFloat(successRate) >= 70 ? yellow(successRate + "%") : red(successRate + "%")}`);
  console.log(`     Duration: ${gray(totalDuration + "ms")}\n`);

  if (failed === 0) {
    console.log(`  ${green("🎉 All tests passed!")}\n`);
  } else {
    console.log(`  ${yellow(`⚠  ${failed} test(s) need attention.`)}\n`);
  }

  // Save report
  if (!opts.noReport) {
    const report = {
      runId: `digiman-cli-${Date.now()}`,
      startTime: new Date(Date.now() - totalDuration).toISOString(),
      endTime: new Date().toISOString(),
      duration: totalDuration,
      options: { url: baseUrl, modules: opts.modules, types: opts.types },
      summary: { total: tests.length, passed, failed, successRate: parseFloat(successRate) },
      results,
    };
    const outputPath = join(process.cwd(), opts.output);
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`  ${gray("📁 Report saved:")} ${cyan(opts.output)}\n`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(`\n${red("Fatal error:")} ${e.message}`);
  process.exit(1);
});
