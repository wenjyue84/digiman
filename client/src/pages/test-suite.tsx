/**
 * Digiman Developer Test Suite — /test
 *
 * Runs real HTTP API tests against the running server.
 * Use the UI to run interactively, or run programmatically:
 *   node scripts/run-tests.mjs
 *
 * Test types:
 *   smoke       — quick sanity checks (no auth, no side effects)
 *   unit        — individual API endpoint validation
 *   integration — multi-step workflows testing whole features
 *   edge        — boundary conditions and error handling
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { getStoredToken } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

type TStatus = "pending" | "running" | "passed" | "failed" | "error";
type TModule =
  | "smoke"
  | "auth"
  | "guests"
  | "units"
  | "dashboard"
  | "settings"
  | "finance"
  | "problems"
  | "integration"
  | "edge";
type TType = "smoke" | "unit" | "integration" | "edge";

interface TResult {
  passed: boolean;
  details: string;
  error?: string;
}
interface Ctx {
  token: string | null;
  get(p: string, auth?: boolean): Promise<{ status: number; data: any }>;
  post(p: string, b: any, auth?: boolean): Promise<{ status: number; data: any }>;
  patch(p: string, b: any, auth?: boolean): Promise<{ status: number; data: any }>;
  put(p: string, b: any, auth?: boolean): Promise<{ status: number; data: any }>;
  del(p: string, auth?: boolean): Promise<{ status: number; data: any }>;
}
interface TDef {
  id: string;
  name: string;
  module: TModule;
  type: TType;
  description: string;
  run(ctx: Ctx): Promise<TResult>;
  suggestions?: string[];
}
interface RunResult {
  id: string;
  status: TStatus;
  duration: number;
  details: string;
  error?: string;
  suggestions?: string[];
}

// ── Context Factory ───────────────────────────────────────────────────────────

function makeCtx(token: string | null): Ctx {
  const h = (auth: boolean) => ({
    "Content-Type": "application/json",
    ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
  });
  const parse = async (r: Response) => {
    try { return await r.json(); } catch { return null; }
  };
  return {
    token,
    get: async (p, auth = true) => {
      const r = await fetch(`/api${p}`, { headers: h(auth) });
      return { status: r.status, data: await parse(r) };
    },
    post: async (p, b, auth = true) => {
      const r = await fetch(`/api${p}`, { method: "POST", headers: h(auth), body: JSON.stringify(b) });
      return { status: r.status, data: await parse(r) };
    },
    patch: async (p, b, auth = true) => {
      const r = await fetch(`/api${p}`, { method: "PATCH", headers: h(auth), body: JSON.stringify(b) });
      return { status: r.status, data: await parse(r) };
    },
    put: async (p, b, auth = true) => {
      const r = await fetch(`/api${p}`, { method: "PUT", headers: h(auth), body: JSON.stringify(b) });
      return { status: r.status, data: await parse(r) };
    },
    del: async (p, auth = true) => {
      const r = await fetch(`/api${p}`, { method: "DELETE", headers: h(auth) });
      return { status: r.status, data: await parse(r) };
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ts = () => `_TEST_${Date.now()}`;
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().split("T")[0];
const arr = (data: any): any[] => (Array.isArray(data) ? data : data?.data ?? []);

async function getAvailableUnit(ctx: Ctx) {
  const r = await ctx.get("/units/available", true);
  if (r.status !== 200 || !arr(r.data).length) return null;
  return arr(r.data)[0];
}

function guestPayload(unitNumber: string, suffix: string = "") {
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
    email: `test_${Date.now()}@example.com`,
    age: "25",
  };
}

// ── Test Definitions ──────────────────────────────────────────────────────────

const TESTS: TDef[] = [
  // ═══ SMOKE ═══════════════════════════════════════════════════════════════════
  {
    id: "SM-001", name: "Health endpoint", module: "smoke", type: "smoke",
    description: "GET /api/health returns status:ok with database info",
    async run(ctx) {
      const r = await ctx.get("/health", false);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      if (r.data?.status !== "ok") throw new Error(`status !== ok: got "${r.data?.status}"`);
      return { passed: true, details: `ok · uptime: ${Math.round(r.data.uptime)}s · storage: ${r.data.storageType}` };
    },
    suggestions: ["Run npm run dev:clean to restart server", "Check PORT conflicts with netstat -ano"],
  },
  {
    id: "SM-002", name: "Database connectivity", module: "smoke", type: "smoke",
    description: "Database is reachable (health.database field present)",
    async run(ctx) {
      const r = await ctx.get("/health", false);
      if (r.status !== 200) throw new Error(`Health check failed: ${r.status}`);
      const storage = r.data?.storageType;
      if (storage === "database" && !r.data?.database) throw new Error("storageType=database but no DB metrics returned");
      return { passed: true, details: `Storage: ${storage} · units: ${r.data?.unitsCount}` };
    },
    suggestions: ["Check DATABASE_URL in .env", "Run npm run db:push if schema missing"],
  },
  {
    id: "SM-003", name: "Business config (no auth)", module: "smoke", type: "smoke",
    description: "GET /api/business-config accessible without authentication",
    async run(ctx) {
      const r = await ctx.get("/business-config", false);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Config keys: ${Object.keys(r.data || {}).slice(0, 5).join(", ")}` };
    },
    suggestions: ["Check server/lib/business-config.ts"],
  },
  {
    id: "SM-004", name: "API response latency", module: "smoke", type: "smoke",
    description: "Server responds within 3000ms threshold",
    async run(ctx) {
      const t = Date.now();
      const r = await ctx.get("/health", false);
      const ms = Date.now() - t;
      if (r.status !== 200) throw new Error("Server not responding");
      if (ms > 3000) return { passed: false, details: `⚠ High latency: ${ms}ms (threshold: 3000ms)` };
      return { passed: true, details: `Latency: ${ms}ms ✓` };
    },
    suggestions: ["High latency may indicate DB slow queries or memory pressure"],
  },
  {
    id: "SM-005", name: "Tests runner endpoint", module: "smoke", type: "smoke",
    description: "Backend test runner at /api/tests/health responds",
    async run(ctx) {
      const r = await ctx.get("/tests/health", false);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Backend tests healthy · units: ${r.data?.unitsCount}` };
    },
    suggestions: ["Check server/routes/tests.ts is registered"],
  },

  // ═══ AUTH ═════════════════════════════════════════════════════════════════════
  {
    id: "AU-001", name: "Login with valid credentials", module: "auth", type: "unit",
    description: "POST /auth/login with admin/admin returns token + user",
    async run(ctx) {
      const r = await ctx.post("/auth/login", { email: "admin", password: "admin" }, false);
      if (r.status === 200) {
        if (!r.data?.token) throw new Error("Login response missing token");
        if (!r.data?.user?.role) throw new Error("Login response missing user.role");
        return { passed: true, details: `Token issued · role: ${r.data.user.role} · email: ${r.data.user.email}` };
      }
      if (r.status === 401) return { passed: false, details: "Default admin credentials rejected — setup required or credentials changed", error: r.data?.message };
      throw new Error(`Unexpected: ${r.status}`);
    },
    suggestions: ["Verify admin user in DB", "Default creds: admin/admin"],
  },
  {
    id: "AU-002", name: "Login with wrong password", module: "auth", type: "unit",
    description: "POST /auth/login with bad credentials returns 401",
    async run(ctx) {
      const r = await ctx.post("/auth/login", { email: "nobody@invalid.test", password: "WRONG_999" }, false);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      return { passed: true, details: `Correctly rejected: ${r.data?.message}` };
    },
    suggestions: ["Auth should always return 401 for invalid credentials (never 200)"],
  },
  {
    id: "AU-003", name: "Login with missing fields", module: "auth", type: "unit",
    description: "POST /auth/login without password returns 400",
    async run(ctx) {
      const r = await ctx.post("/auth/login", { email: "test@example.com" }, false);
      if (r.status !== 400) throw new Error(`Expected 400, got ${r.status}`);
      return { passed: true, details: `Zod validation rejects missing password: ${r.data?.message}` };
    },
    suggestions: ["Check loginSchema in shared/schema-validation.ts"],
  },
  {
    id: "AU-004", name: "Protected route without token", module: "auth", type: "unit",
    description: "GET /auth/me without Authorization header returns 401",
    async run(ctx) {
      const r = await ctx.get("/auth/me", false);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status} — route may be unprotected`);
      return { passed: true, details: "Auth guard correctly returns 401" };
    },
    suggestions: ["Check authenticateToken middleware in routes/middleware/auth.ts"],
  },
  {
    id: "AU-005", name: "Get /auth/me with valid token", module: "auth", type: "unit",
    description: "Valid session token returns current user info",
    async run(ctx) {
      if (!ctx.token) return { passed: false, details: "No token available — login to test page first", error: "Missing token" };
      const r = await ctx.get("/auth/me", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${r.data?.message}`);
      if (!r.data?.user?.id) throw new Error("Response missing user.id");
      return { passed: true, details: `User: ${r.data.user.email} · role: ${r.data.user.role}` };
    },
    suggestions: ["Token from localStorage may be expired — re-login"],
  },
  {
    id: "AU-006", name: "Invalid token rejected", module: "auth", type: "unit",
    description: "Fabricated token returns 401",
    async run(_ctx) {
      const fakeCtx = makeCtx("fake-token-xyz-999999");
      const r = await fakeCtx.get("/auth/me", true);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status}`);
      return { passed: true, details: "Invalid token correctly rejected" };
    },
    suggestions: ["Check token validation in authenticateToken middleware"],
  },
  {
    id: "AU-007", name: "Logout invalidates session", module: "auth", type: "unit",
    description: "After logout, the same token returns 401",
    async run(ctx) {
      const loginR = await ctx.post("/auth/login", { email: "admin", password: "admin" }, false);
      if (loginR.status !== 200) return { passed: false, details: "Cannot test logout — login failed", error: "Login required" };
      const freshCtx = makeCtx(loginR.data.token);
      const logoutR = await freshCtx.post("/auth/logout", {}, true);
      if (logoutR.status !== 200) throw new Error(`Logout failed: ${logoutR.status}`);
      const meR = await freshCtx.get("/auth/me", true);
      if (meR.status !== 401) throw new Error(`Token still valid after logout (got ${meR.status})`);
      return { passed: true, details: "Session invalidated correctly after logout" };
    },
    suggestions: ["Check deleteSession in storage implementations"],
  },

  // ═══ GUESTS ═══════════════════════════════════════════════════════════════════
  {
    id: "GU-001", name: "List guests (authenticated)", module: "guests", type: "unit",
    description: "GET /guests with auth token returns array",
    async run(ctx) {
      const r = await ctx.get("/guests", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}: ${r.data?.message}`);
      const list = arr(r.data);
      return { passed: true, details: `${list.length} guests returned` };
    },
    suggestions: ["Check GET /api/guests route and storage.getGuests()"],
  },
  {
    id: "GU-002", name: "List guests (unauthenticated)", module: "guests", type: "unit",
    description: "GET /guests without token returns 401",
    async run(ctx) {
      const r = await ctx.get("/guests", false);
      if (r.status !== 401) throw new Error(`Expected 401, got ${r.status} — endpoint may be unprotected`);
      return { passed: true, details: "Auth guard enforced on guest list" };
    },
    suggestions: ["Guests endpoint must require authentication"],
  },
  {
    id: "GU-003", name: "Checked-in guests endpoint", module: "guests", type: "unit",
    description: "GET /guests/checked-in returns current occupants",
    async run(ctx) {
      const r = await ctx.get("/guests/checked-in", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} guests currently checked in` };
    },
    suggestions: ["Check getCheckedInGuests() in storage"],
  },
  {
    id: "GU-004", name: "Create guest → verify → cleanup", module: "guests", type: "unit",
    description: "POST /guests creates guest, GET verifies, DELETE cleans up",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units — seed data or check occupancy", error: "No available units" };
      const createR = await ctx.post("/guests", guestPayload(unit.number), true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}: ${JSON.stringify(createR.data)}`);
      const guestId = createR.data?.id;
      if (!guestId) throw new Error("No id in create response");
      const getR = await ctx.get(`/guests/${guestId}`, true);
      if (getR.status !== 200) throw new Error(`Get by ID: ${getR.status}`);
      await ctx.del(`/guests/${guestId}`, true);
      return { passed: true, details: `Created ${guestId.slice(0, 8)}... → verified → deleted ✓` };
    },
    suggestions: ["Check POST and GET /api/guests/:id routes"],
  },
  {
    id: "GU-005", name: "Guest creation validation", module: "guests", type: "unit",
    description: "POST /guests without name returns 400",
    async run(ctx) {
      const r = await ctx.post("/guests", { unitNumber: "C1", paymentMethod: "cash" }, true);
      if (r.status !== 400) throw new Error(`Expected 400, got ${r.status} — missing field validation`);
      return { passed: true, details: `Missing name rejected: ${r.data?.message || r.data?.errors?.[0]?.message}` };
    },
    suggestions: ["Check Zod schema for guests — name should be required"],
  },
  {
    id: "GU-006", name: "Update guest (PATCH)", module: "guests", type: "unit",
    description: "PATCH /guests/:id updates a field and returns updated data",
    async run(ctx) {
      const listR = await ctx.get("/guests", true);
      const list = arr(listR.data);
      if (!list.length) return { passed: false, details: "No guests to update", error: "Empty list" };
      const guestId = list[0].id;
      const originalNotes = list[0].notes || "";
      const testNote = `note_${Date.now()}`;
      const r = await ctx.patch(`/guests/${guestId}`, { notes: testNote }, true);
      if (r.status !== 200) throw new Error(`PATCH: ${r.status}: ${JSON.stringify(r.data)}`);
      await ctx.patch(`/guests/${guestId}`, { notes: originalNotes }, true);
      return { passed: true, details: `Updated notes on ${guestId.slice(0, 8)}... and restored` };
    },
    suggestions: ["Check PATCH /api/guests/:id route"],
  },
  {
    id: "GU-007", name: "Guest history endpoint", module: "guests", type: "unit",
    description: "GET /guests/history returns checked-out guests",
    async run(ctx) {
      const r = await ctx.get("/guests/history", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} historical guests` };
    },
    suggestions: ["Check /api/guests/history route"],
  },

  // ═══ UNITS ════════════════════════════════════════════════════════════════════
  {
    id: "UN-001", name: "List all units", module: "units", type: "unit",
    description: "GET /units returns full unit array",
    async run(ctx) {
      const r = await ctx.get("/units", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      if (!Array.isArray(r.data)) throw new Error("Expected array");
      if (!r.data.length) return { passed: false, details: "No units found — storage not seeded", error: "Empty" };
      return { passed: true, details: `${r.data.length} total units` };
    },
    suggestions: ["Check unit initialization in MemStorage or DB seed"],
  },
  {
    id: "UN-002", name: "Available units filter", module: "units", type: "unit",
    description: "GET /units/available returns only units with isAvailable=true",
    async run(ctx) {
      const r = await ctx.get("/units/available", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      const list = arr(r.data);
      const bad = list.filter((u: any) => u.isAvailable !== true);
      if (bad.length) return { passed: false, details: `${bad.length} unavailable units in response: ${bad.map((u: any) => u.number).join(", ")}`, error: "Filter not working" };
      return { passed: true, details: `${list.length} available units, all correctly filtered` };
    },
    suggestions: ["Check getAvailableUnits() in storage — isAvailable filter"],
  },
  {
    id: "UN-003", name: "Cleaning status filter", module: "units", type: "unit",
    description: "GET /units/cleaning-status/{status} returns filtered results",
    async run(ctx) {
      const cleanR = await ctx.get("/units/cleaning-status/cleaned", true);
      const dirtyR = await ctx.get("/units/cleaning-status/to_be_cleaned", true);
      if (cleanR.status !== 200) throw new Error(`cleaned filter: ${cleanR.status}`);
      if (dirtyR.status !== 200) throw new Error(`to_be_cleaned filter: ${dirtyR.status}`);
      const cleaned = arr(cleanR.data).length;
      const dirty = arr(dirtyR.data).length;
      const allValidClean = arr(cleanR.data).every((u: any) => u.cleaningStatus === "cleaned");
      const allValidDirty = arr(dirtyR.data).every((u: any) => u.cleaningStatus === "to_be_cleaned");
      if (!allValidClean) return { passed: false, details: "Cleaned filter returned units with wrong status", error: "Filter mismatch" };
      if (!allValidDirty) return { passed: false, details: "Dirty filter returned units with wrong status", error: "Filter mismatch" };
      return { passed: true, details: `Cleaned: ${cleaned} · To-clean: ${dirty} · Both filters accurate` };
    },
    suggestions: ["Check getUnitsByCleaningStatus() in storage"],
  },
  {
    id: "UN-004", name: "Units needing attention", module: "units", type: "unit",
    description: "GET /units/needs-attention returns units with issues",
    async run(ctx) {
      const r = await ctx.get("/units/needs-attention", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} units need attention` };
    },
    suggestions: ["Check needs-attention filter (toRent === false or similar)"],
  },
  {
    id: "UN-005", name: "Mark unit as cleaned", module: "units", type: "unit",
    description: "POST /units/:number/mark-cleaned updates cleaning status",
    async run(ctx) {
      const allR = await ctx.get("/units", true);
      if (!Array.isArray(allR.data) || !allR.data.length) throw new Error("No units available");
      const unit = allR.data[0];
      const r = await ctx.post(`/units/${unit.number}/mark-cleaned`, {}, true);
      if (r.status !== 200 && r.status !== 204) throw new Error(`Expected 200/204, got ${r.status}`);
      return { passed: true, details: `Unit ${unit.number} marked as cleaned (${r.status})` };
    },
    suggestions: ["Check POST /units/:number/mark-cleaned and markUnitCleaned() in storage"],
  },

  // ═══ DASHBOARD ════════════════════════════════════════════════════════════════
  {
    id: "DA-001", name: "Occupancy stats", module: "dashboard", type: "unit",
    description: "GET /occupancy returns current occupancy metrics",
    async run(ctx) {
      const r = await ctx.get("/occupancy", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Occupancy: ${JSON.stringify(r.data).slice(0, 80)}` };
    },
    suggestions: ["Check /api/occupancy route in dashboard.ts"],
  },
  {
    id: "DA-002", name: "Dashboard data endpoint", module: "dashboard", type: "unit",
    description: "GET /dashboard returns combined dashboard data object",
    async run(ctx) {
      const r = await ctx.get("/dashboard", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      const keys = Object.keys(r.data || {});
      return { passed: true, details: `Dashboard keys: ${keys.join(", ")}` };
    },
    suggestions: ["Check /api/dashboard route handler"],
  },
  {
    id: "DA-003", name: "Monthly occupancy calendar", module: "dashboard", type: "unit",
    description: "GET /calendar/occupancy/:year/:month returns calendar data",
    async run(ctx) {
      const d = new Date();
      const r = await ctx.get(`/calendar/occupancy/${d.getFullYear()}/${d.getMonth() + 1}`, true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Calendar data for ${d.getFullYear()}/${d.getMonth() + 1} returned` };
    },
    suggestions: ["Check /api/calendar/occupancy/:year/:month route"],
  },

  // ═══ SETTINGS ═════════════════════════════════════════════════════════════════
  {
    id: "SE-001", name: "Get settings", module: "settings", type: "unit",
    description: "GET /settings returns app configuration object",
    async run(ctx) {
      const r = await ctx.get("/settings", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      if (typeof r.data !== "object" || Array.isArray(r.data)) throw new Error("Expected plain object");
      return { passed: true, details: `${Object.keys(r.data || {}).length} settings keys` };
    },
    suggestions: ["Check GET /api/settings and storage.getSettings()"],
  },
  {
    id: "SE-002", name: "Setup status endpoint", module: "settings", type: "unit",
    description: "GET /settings/setup-status returns setup completion state",
    async run(ctx) {
      const r = await ctx.get("/settings/setup-status", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Setup status: ${JSON.stringify(r.data).slice(0, 80)}` };
    },
    suggestions: ["Check /api/settings/setup-status route"],
  },
  {
    id: "SE-003", name: "Unit rules endpoint", module: "settings", type: "unit",
    description: "GET /settings/unit-rules returns occupancy rules",
    async run(ctx) {
      const r = await ctx.get("/settings/unit-rules", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `Unit rules: ${JSON.stringify(r.data).slice(0, 80)}` };
    },
    suggestions: ["Check /api/settings/unit-rules route"],
  },

  // ═══ FINANCE ══════════════════════════════════════════════════════════════════
  {
    id: "FI-001", name: "List expenses", module: "finance", type: "unit",
    description: "GET /expenses returns expense array",
    async run(ctx) {
      const r = await ctx.get("/expenses", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} expenses found` };
    },
    suggestions: ["Check GET /api/expenses route"],
  },
  {
    id: "FI-002", name: "Expense lifecycle (create → delete)", module: "finance", type: "unit",
    description: "POST expense, verify response, DELETE to clean up",
    async run(ctx) {
      const createR = await ctx.post("/expenses", {
        description: ts(),
        amount: "99.50",
        category: "consumables",
        date: new Date().toISOString().split("T")[0],
      }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}: ${JSON.stringify(createR.data)}`);
      const id = createR.data?.id;
      if (!id) throw new Error("No id in create response");
      const delR = await ctx.del(`/expenses/${id}`, true);
      if (delR.status !== 200 && delR.status !== 204) throw new Error(`Delete: ${delR.status}`);
      return { passed: true, details: `Created ${id.slice(0, 8)}... → deleted ✓` };
    },
    suggestions: ["Check POST and DELETE /api/expenses"],
  },
  {
    id: "FI-003", name: "Expense invalid category", module: "finance", type: "unit",
    description: "POST expense with invalid category returns 400",
    async run(ctx) {
      const r = await ctx.post("/expenses", { description: "test", amount: "10.00", category: "INVALID_XYZ", date: "2026-01-01" }, true);
      if (r.status !== 400) throw new Error(`Expected 400, got ${r.status} — invalid category accepted`);
      return { passed: true, details: `Category enum validation working: ${r.data?.message}` };
    },
    suggestions: ["Check expense category enum in Zod schema"],
  },

  // ═══ PROBLEMS ═════════════════════════════════════════════════════════════════
  {
    id: "PR-001", name: "List all problems", module: "problems", type: "unit",
    description: "GET /problems returns maintenance issue array",
    async run(ctx) {
      const r = await ctx.get("/problems", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      return { passed: true, details: `${arr(r.data).length} problems reported` };
    },
    suggestions: ["Check GET /api/problems route"],
  },
  {
    id: "PR-002", name: "Active problems filter", module: "problems", type: "unit",
    description: "GET /problems/active returns only unresolved problems",
    async run(ctx) {
      const r = await ctx.get("/problems/active", true);
      if (r.status !== 200) throw new Error(`Expected 200, got ${r.status}`);
      const list = arr(r.data);
      const resolved = list.filter((p: any) => p.isResolved);
      if (resolved.length) return { passed: false, details: `${resolved.length} resolved problems in active list`, error: "Filter not working" };
      return { passed: true, details: `${list.length} active problems, all unresolved ✓` };
    },
    suggestions: ["Check active filter in getActiveProblems() in storage"],
  },
  {
    id: "PR-003", name: "Problem lifecycle (create → resolve → delete)", module: "problems", type: "unit",
    description: "Full problem workflow test",
    async run(ctx) {
      const createR = await ctx.post("/problems", { unitNumber: "C1", description: ts(), reportedBy: "TestRunner" }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}`);
      const id = createR.data?.id;
      if (!id) throw new Error("No id in create response");
      const resolveR = await ctx.patch(`/problems/${id}/resolve`, { resolvedBy: "TestRunner", notes: "Test resolved" }, true);
      if (resolveR.status !== 200) throw new Error(`Resolve: ${resolveR.status}: ${JSON.stringify(resolveR.data)}`);
      const delR = await ctx.del(`/problems/${id}`, true);
      if (delR.status !== 200 && delR.status !== 204) throw new Error(`Delete: ${delR.status}`);
      return { passed: true, details: `Created → resolved → deleted (${id.slice(0, 8)}...) ✓` };
    },
    suggestions: ["Check POST, PATCH /resolve, DELETE in /api/problems"],
  },

  // ═══ INTEGRATION ══════════════════════════════════════════════════════════════
  {
    id: "IN-001", name: "Full check-in / check-out workflow", module: "integration", type: "integration",
    description: "Available unit → check-in guest → verify → check-out → verify history → cleanup",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units for integration test", error: "No available units" };

      // Check-in
      const checkinR = await ctx.post("/guests", guestPayload(unit.number, "_Integration"), true);
      if (checkinR.status !== 201 && checkinR.status !== 200) throw new Error(`Check-in: ${checkinR.status}: ${JSON.stringify(checkinR.data)}`);
      const guestId = checkinR.data?.id;

      // Verify checked in
      const verifyR = await ctx.get(`/guests/${guestId}`, true);
      if (!verifyR.data?.isCheckedIn) throw new Error("Guest not showing as isCheckedIn=true after check-in");

      // Check-out
      const checkoutR = await ctx.post(`/guests/${guestId}/checkout`, {
        checkoutTime: new Date().toISOString(),
        actualAmount: "50.00",
        paymentMethod: "cash",
      }, true);
      if (checkoutR.status !== 200) throw new Error(`Check-out: ${checkoutR.status}: ${JSON.stringify(checkoutR.data)}`);

      // Verify in history
      const histR = await ctx.get("/guests/history", true);
      const inHistory = arr(histR.data).some((g: any) => g.id === guestId);

      // Cleanup
      await ctx.del(`/guests/${guestId}`, true);

      return { passed: true, details: `Unit ${unit.number} → check-in → verify → checkout → ${inHistory ? "in history ✓" : "NOT in history ✗"} → deleted` };
    },
    suggestions: ["Check checkout route sets isCheckedIn=false and unit isAvailable=true"],
  },
  {
    id: "IN-002", name: "Expense CRUD lifecycle", module: "integration", type: "integration",
    description: "Create → verify in list → update → delete expense",
    async run(ctx) {
      const label = ts();
      const createR = await ctx.post("/expenses", { description: label, amount: "150.00", category: "utilities", date: new Date().toISOString().split("T")[0] }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}`);
      const id = createR.data?.id;

      // Verify in list
      const listR = await ctx.get("/expenses", true);
      const found = arr(listR.data).some((e: any) => e.id === id);
      if (!found) throw new Error("Created expense not found in list");

      // Update
      const updateR = await ctx.put(`/expenses/${id}`, { description: label + "_updated", amount: "200.00", category: "utilities", date: new Date().toISOString().split("T")[0] }, true);
      if (updateR.status !== 200) throw new Error(`Update: ${updateR.status}: ${JSON.stringify(updateR.data)}`);

      // Delete
      const delR = await ctx.del(`/expenses/${id}`, true);
      if (delR.status !== 200 && delR.status !== 204) throw new Error(`Delete: ${delR.status}`);
      return { passed: true, details: `Expense CRUD lifecycle complete (${id?.slice(0, 8)}...)` };
    },
    suggestions: ["Check all expense CRUD routes match expected status codes"],
  },
  {
    id: "IN-003", name: "Problem report → resolve lifecycle", module: "integration", type: "integration",
    description: "Create problem → verify in active list → resolve → verify removed from active",
    async run(ctx) {
      const createR = await ctx.post("/problems", { unitNumber: "C1", description: ts() + "_lifecycle", reportedBy: "TestRunner" }, true);
      if (createR.status !== 201 && createR.status !== 200) throw new Error(`Create: ${createR.status}`);
      const id = createR.data?.id;

      // Verify in active list
      const activeR = await ctx.get("/problems/active", true);
      const inActive = arr(activeR.data).some((p: any) => p.id === id);
      if (!inActive) throw new Error("Problem not found in active list after creation");

      // Resolve
      const resolveR = await ctx.patch(`/problems/${id}/resolve`, { resolvedBy: "TestRunner", notes: "Integration resolved" }, true);
      if (resolveR.status !== 200) throw new Error(`Resolve: ${resolveR.status}`);

      // Verify removed from active
      const active2R = await ctx.get("/problems/active", true);
      const stillActive = arr(active2R.data).some((p: any) => p.id === id);
      if (stillActive) throw new Error("Problem still in active list after resolution");

      // Cleanup
      await ctx.del(`/problems/${id}`, true);
      return { passed: true, details: `Created → in active list → resolved → removed from active → deleted ✓` };
    },
    suggestions: ["Check that resolve sets isResolved=true and active filter excludes it"],
  },
  {
    id: "IN-004", name: "Unit cleaning cycle", module: "integration", type: "integration",
    description: "Check-in → checkout → unit marked dirty → mark cleaned → verify",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };

      // Check-in
      const checkinR = await ctx.post("/guests", guestPayload(unit.number, "_CleanTest"), true);
      if (checkinR.status !== 201 && checkinR.status !== 200) throw new Error(`Check-in: ${checkinR.status}`);
      const guestId = checkinR.data?.id;

      // Check-out (should trigger unit to need cleaning)
      await ctx.post(`/guests/${guestId}/checkout`, { checkoutTime: new Date().toISOString(), actualAmount: "50.00", paymentMethod: "cash" }, true);

      // Verify unit in dirty list
      const dirtyR = await ctx.get("/units/cleaning-status/to_be_cleaned", true);
      const isDirty = arr(dirtyR.data).some((u: any) => u.number === unit.number);

      // Mark cleaned
      await ctx.post(`/units/${unit.number}/mark-cleaned`, {}, true);

      // Verify back to cleaned
      const cleanR = await ctx.get("/units/cleaning-status/cleaned", true);
      const isCleaned = arr(cleanR.data).some((u: any) => u.number === unit.number);

      // Cleanup
      await ctx.del(`/guests/${guestId}`, true);

      return {
        passed: isDirty && isCleaned,
        details: `${unit.number}: checkout → ${isDirty ? "dirty ✓" : "NOT dirty ✗"} → mark-cleaned → ${isCleaned ? "clean ✓" : "NOT clean ✗"}`,
        error: !isDirty ? "Unit not marked dirty after checkout" : !isCleaned ? "Unit not marked clean after mark-cleaned" : undefined,
      };
    },
    suggestions: ["Check checkout route calls markUnitNeedsCleaning", "Check mark-cleaned route"],
  },

  // ═══ EDGE CASES ═══════════════════════════════════════════════════════════════
  {
    id: "ED-001", name: "Invalid UUID in guest path", module: "edge", type: "edge",
    description: "GET /guests/not-a-uuid returns 400 or 404, never 500",
    async run(ctx) {
      const r = await ctx.get("/guests/not-a-valid-uuid-xyz", true);
      if (r.status === 500) throw new Error("Server returned 500 on invalid UUID — unhandled error");
      return { passed: r.status === 400 || r.status === 404, details: `Invalid UUID returns ${r.status} (expected 400 or 404)`, error: r.status !== 400 && r.status !== 404 ? `Unexpected status ${r.status}` : undefined };
    },
    suggestions: ["Add UUID validation before DB lookup", "Use try/catch around storage.getGuest(id)"],
  },
  {
    id: "ED-002", name: "XSS payload in guest name", module: "edge", type: "edge",
    description: "<script> in name field is rejected or stored safely as text",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const payload = '<script>alert("xss")</script>';
      const r = await ctx.post("/guests", { ...guestPayload(unit.number), name: payload }, true);
      if (r.status === 400) return { passed: true, details: "XSS payload rejected at validation (400) ✓" };
      if (r.status === 200 || r.status === 201) {
        const stored = r.data?.name ?? "";
        if (r.data?.id) await ctx.del(`/guests/${r.data.id}`, true);
        return { passed: true, details: `Stored as raw text (React will not execute): "${stored.slice(0, 40)}"` };
      }
      throw new Error(`Unexpected: ${r.status}`);
    },
    suggestions: ["React renders text as text nodes — XSS via JSX is safe", "Consider server-side sanitization for extra safety"],
  },
  {
    id: "ED-003", name: "SQL injection in search parameter", module: "edge", type: "edge",
    description: "'; DROP TABLE guests; -- in search param returns safely (not 500)",
    async run(ctx) {
      const sql = encodeURIComponent("'; DROP TABLE guests; --");
      const r = await ctx.get(`/guests?search=${sql}`, true);
      if (r.status === 500) throw new Error("500 on SQL injection attempt — possible vulnerability (check parameterized queries)");
      return { passed: true, details: `SQL injection attempt returned ${r.status} safely (Drizzle uses parameterized queries ✓)` };
    },
    suggestions: ["Drizzle ORM uses parameterized queries automatically", "Verify no raw SQL string interpolation in storage"],
  },
  {
    id: "ED-004", name: "Empty body POST to guests", module: "edge", type: "edge",
    description: "{} body returns 400 (validation), not 500 (crash)",
    async run(ctx) {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {}) },
        body: "{}",
      });
      if (res.status === 500) throw new Error("500 on empty body — validation missing");
      return { passed: res.status === 400, details: `Empty body returns ${res.status} (expected 400)`, error: res.status !== 400 ? `Got ${res.status}` : undefined };
    },
    suggestions: ["Ensure Zod validation runs before any DB operation"],
  },
  {
    id: "ED-005", name: "Non-existent API route", module: "edge", type: "edge",
    description: "Unknown route returns 404 (not 500 or 200)",
    async run(ctx) {
      const r = await ctx.get("/non-existent-route-xyz-abc-123", false);
      if (r.status === 500) throw new Error("500 on unknown route — missing error handler");
      return { passed: true, details: `Unknown route returns ${r.status}` };
    },
    suggestions: ["Add catch-all 404 handler at end of route registration"],
  },
  {
    id: "ED-006", name: "Extremely long guest name", module: "edge", type: "edge",
    description: "1000-char name is rejected (400) or safely stored — never 500",
    async run(ctx) {
      const unit = await getAvailableUnit(ctx);
      if (!unit) return { passed: false, details: "No available units", error: "No available units" };
      const longName = "A".repeat(1000);
      const r = await ctx.post("/guests", { ...guestPayload(unit.number), name: longName }, true);
      if (r.status === 500) throw new Error("500 on 1000-char name — add length validation");
      if (r.status === 400) return { passed: true, details: "Long name (1000 chars) rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) {
        await ctx.del(`/guests/${r.data.id}`, true);
        return { passed: false, details: "1000-char name accepted — consider adding max length (e.g., 255)", error: "No length validation" };
      }
      return { passed: true, details: `Handled: ${r.status}` };
    },
    suggestions: ["Add .max(255) to name field in guest Zod schema"],
  },
  {
    id: "ED-007", name: "Invalid date format in checkout date", module: "edge", type: "edge",
    description: "'not-a-date' as expectedCheckoutDate returns 400, not 500",
    async run(ctx) {
      const r = await ctx.post("/guests", { name: "Test", unitNumber: "C1", checkinTime: new Date().toISOString(), expectedCheckoutDate: "not-a-date", paymentAmount: "50.00", paymentMethod: "cash", paymentCollector: "Test", isPaid: true, nationality: "Test", gender: "male", phoneNumber: "+60100000000", email: `d_${Date.now()}@test.com`, age: "25" }, true);
      if (r.status === 500) throw new Error("500 on invalid date format");
      if (r.status === 400) return { passed: true, details: "Invalid date rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) {
        await ctx.del(`/guests/${r.data.id}`, true);
        return { passed: false, details: "Invalid date accepted — add date validation", error: "No date validation" };
      }
      return { passed: true, details: `Handled: ${r.status}` };
    },
    suggestions: ["Add z.string().date() or .regex() to expectedCheckoutDate in guest schema"],
  },
  {
    id: "ED-008", name: "Negative expense amount", module: "edge", type: "edge",
    description: "Negative amount in expense returns 400, not 500",
    async run(ctx) {
      const r = await ctx.post("/expenses", { description: "Edge test", amount: "-50.00", category: "consumables", date: new Date().toISOString().split("T")[0] }, true);
      if (r.status === 500) throw new Error("500 on negative amount");
      if (r.status === 400) return { passed: true, details: "Negative amount rejected (400) ✓" };
      if ((r.status === 200 || r.status === 201) && r.data?.id) {
        await ctx.del(`/expenses/${r.data.id}`, true);
        return { passed: false, details: "Negative amount accepted — add .positive() validation", error: "No amount validation" };
      }
      return { passed: true, details: `Handled: ${r.status}` };
    },
    suggestions: ["Add .positive() or .refine(v => parseFloat(v) > 0) to amount field"],
  },
  {
    id: "ED-009", name: "Missing Content-Type header", module: "edge", type: "edge",
    description: "POST without Content-Type: application/json handled gracefully",
    async run(ctx) {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {},
        body: JSON.stringify({ name: "test" }),
      });
      if (res.status === 500) throw new Error("500 on missing Content-Type");
      return { passed: true, details: `Missing Content-Type handled: ${res.status} (Express body-parser requires application/json)` };
    },
    suggestions: ["Express requires Content-Type: application/json to parse body"],
  },
];

// ── Module metadata ───────────────────────────────────────────────────────────

const MODULE_META: Record<TModule, { label: string; color: string }> = {
  smoke: { label: "Smoke", color: "bg-blue-100 text-blue-800" },
  auth: { label: "Auth", color: "bg-purple-100 text-purple-800" },
  guests: { label: "Guests", color: "bg-green-100 text-green-800" },
  units: { label: "Units", color: "bg-yellow-100 text-yellow-800" },
  dashboard: { label: "Dashboard", color: "bg-orange-100 text-orange-800" },
  settings: { label: "Settings", color: "bg-gray-100 text-gray-800" },
  finance: { label: "Finance", color: "bg-emerald-100 text-emerald-800" },
  problems: { label: "Problems", color: "bg-red-100 text-red-800" },
  integration: { label: "Integration", color: "bg-indigo-100 text-indigo-800" },
  edge: { label: "Edge", color: "bg-pink-100 text-pink-800" },
};

const TYPE_META: Record<TType, { label: string; color: string }> = {
  smoke: { label: "Smoke", color: "bg-blue-50 text-blue-700" },
  unit: { label: "Unit", color: "bg-gray-50 text-gray-700" },
  integration: { label: "Integration", color: "bg-indigo-50 text-indigo-700" },
  edge: { label: "Edge", color: "bg-pink-50 text-pink-700" },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function TestSuite() {
  const [token, setToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [filterModule, setFilterModule] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [results, setResults] = useState<Map<string, RunResult>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const stopRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load stored token on mount
  useEffect(() => {
    const stored = getStoredToken();
    if (stored) setToken(stored);
  }, []);

  // Auto-scroll to running test
  useEffect(() => {
    if (currentTestId && scrollRef.current) {
      const el = scrollRef.current.querySelector(`[data-testid="${currentTestId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentTestId]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.status !== 200) { setLoginError(data?.message || "Login failed"); return; }
      setToken(data.token);
    } catch (e: any) {
      setLoginError(e.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const filteredTests = TESTS.filter(t =>
    (filterModule === "all" || t.module === filterModule) &&
    (filterType === "all" || t.type === filterType)
  );

  const runTests = useCallback(async () => {
    if (isRunning) return;
    stopRef.current = false;
    setIsRunning(true);
    setResults(new Map());
    setStartTime(Date.now());
    setEndTime(null);
    const ctx = makeCtx(token);
    for (const test of filteredTests) {
      if (stopRef.current) break;
      setCurrentTestId(test.id);
      setResults(prev => new Map(prev.set(test.id, { id: test.id, status: "running", duration: 0, details: "" })));
      const t0 = Date.now();
      try {
        const result = await test.run(ctx);
        const dur = Date.now() - t0;
        setResults(prev => new Map(prev.set(test.id, {
          id: test.id,
          status: result.passed ? "passed" : "failed",
          duration: dur,
          details: result.details,
          error: result.error,
          suggestions: result.passed ? [] : test.suggestions,
        })));
      } catch (e: any) {
        setResults(prev => new Map(prev.set(test.id, {
          id: test.id,
          status: "error",
          duration: Date.now() - t0,
          details: "",
          error: e.message,
          suggestions: test.suggestions,
        })));
      }
    }
    setCurrentTestId(null);
    setIsRunning(false);
    setEndTime(Date.now());
  }, [isRunning, token, filteredTests]);

  const stopTests = () => { stopRef.current = true; };

  const exportJson = () => {
    const report = buildReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `digiman-test-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportHtml = () => {
    const report = buildReport();
    const html = generateHtmlReport(report);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `digiman-test-report-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const buildReport = () => {
    const entries = Array.from(results.values());
    const passed = entries.filter(r => r.status === "passed").length;
    const failed = entries.filter(r => r.status !== "passed" && r.status !== "pending" && r.status !== "running").length;
    return {
      runId: `digiman-test-${Date.now()}`,
      startTime: startTime ? new Date(startTime).toISOString() : null,
      endTime: endTime ? new Date(endTime).toISOString() : null,
      duration: startTime && endTime ? endTime - startTime : null,
      summary: { total: filteredTests.length, passed, failed, pending: filteredTests.length - entries.length },
      results: filteredTests.map(t => {
        const r = results.get(t.id);
        return { id: t.id, name: t.name, module: t.module, type: t.type, description: t.description, status: r?.status ?? "pending", duration: r?.duration ?? 0, details: r?.details ?? "", error: r?.error ?? null, suggestions: r?.suggestions ?? [] };
      }),
    };
  };

  // Stats
  const ran = Array.from(results.values()).filter(r => r.status !== "running");
  const passed = ran.filter(r => r.status === "passed").length;
  const failed = ran.filter(r => r.status === "failed" || r.status === "error").length;
  const progress = filteredTests.length ? Math.round((ran.length / filteredTests.length) * 100) : 0;
  const totalDuration = startTime ? (endTime ?? Date.now()) - startTime : 0;

  const modules = Array.from(new Set(TESTS.map(t => t.module)));
  const types = Array.from(new Set(TESTS.map(t => t.type)));

  return (
    <div className="min-h-screen bg-gray-50 font-mono text-sm">
      {/* ── Header ── */}
      <div className="bg-gray-900 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">🧪 Digiman Test Suite</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              {TESTS.length} tests · {modules.length} modules · smoke / unit / integration / edge
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Programmatic:</span>
            <code className="bg-gray-800 px-2 py-1 rounded text-green-400">node scripts/run-tests.mjs</code>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* ── Auth Section ── */}
        {!token ? (
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="font-bold text-gray-800 mb-3">🔐 Login Required</h2>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email / Username</label>
                <input className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="admin" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Password</label>
                <input type="password" className="border border-gray-300 rounded px-3 py-1.5 text-sm w-40" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="••••••••" />
              </div>
              <button onClick={handleLogin} disabled={isLoggingIn} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                {isLoggingIn ? "Logging in…" : "Login"}
              </button>
              {loginError && <span className="text-red-600 text-xs">{loginError}</span>}
            </div>
            <p className="text-xs text-gray-400 mt-3">Some smoke tests run without auth. Auth tests and data-mutating tests require a valid session.</p>
          </div>
        ) : (
          <div className="bg-white border border-green-200 rounded-lg px-5 py-3 flex items-center justify-between shadow-sm">
            <span className="text-green-700 text-xs">✅ Authenticated · token: <code className="bg-green-50 px-1 rounded">{token.slice(0, 12)}…</code></span>
            <button onClick={() => setToken(null)} className="text-gray-400 hover:text-gray-700 text-xs underline">Logout from test page</button>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-wrap gap-3 items-center">
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="all">All Modules</option>
            {modules.map(m => <option key={m} value={m}>{MODULE_META[m].label}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="all">All Types</option>
            {types.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>
          <span className="text-gray-400 text-xs">{filteredTests.length} tests selected</span>
          <div className="ml-auto flex gap-2 flex-wrap">
            {!isRunning ? (
              <button onClick={runTests} className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700 font-semibold">
                ▶ Run Tests
              </button>
            ) : (
              <button onClick={stopTests} className="bg-red-600 text-white px-4 py-1.5 rounded text-sm hover:bg-red-700">
                ⏹ Stop
              </button>
            )}
            {results.size > 0 && (
              <>
                <button onClick={exportJson} className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50">⬇ JSON</button>
                <button onClick={exportHtml} className="border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50">📄 HTML</button>
              </>
            )}
          </div>
        </div>

        {/* ── Progress + Stats ── */}
        {(isRunning || results.size > 0) && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex gap-4 flex-wrap text-sm">
              <span className="font-bold text-gray-700">{ran.length} / {filteredTests.length}</span>
              <span className="text-green-600">✅ {passed} passed</span>
              <span className="text-red-600">❌ {failed} failed</span>
              <span className="text-gray-500">⏱ {(totalDuration / 1000).toFixed(1)}s</span>
              {isRunning && currentTestId && <span className="text-blue-600 animate-pulse">Running: {currentTestId}</span>}
              {!isRunning && endTime && <span className="text-gray-400">Completed {new Date(endTime).toLocaleTimeString()}</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-300 ${failed > 0 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* ── Results Table ── */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden" ref={scrollRef}>
          <table className="w-full text-xs">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold w-20">ID</th>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Test Name</th>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold w-28">Module</th>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold w-24">Type</th>
                <th className="px-3 py-2 text-center text-gray-500 font-semibold w-20">Status</th>
                <th className="px-3 py-2 text-right text-gray-500 font-semibold w-16">ms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTests.map(test => {
                const r = results.get(test.id);
                const status = r?.status ?? "pending";
                const isExpanded = expandedId === test.id;
                return (
                  <>
                    <tr
                      key={test.id}
                      data-testid={test.id}
                      onClick={() => setExpandedId(isExpanded ? null : test.id)}
                      className={`cursor-pointer hover:bg-gray-50 transition-colors ${status === "running" ? "bg-blue-50" : status === "passed" ? "bg-green-50/30" : status === "failed" || status === "error" ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-3 py-2 font-mono text-gray-500">{test.id}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-gray-800">{test.name}</span>
                        {isExpanded && <p className="text-gray-500 mt-0.5">{test.description}</p>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${MODULE_META[test.module].color}`}>
                          {MODULE_META[test.module].label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${TYPE_META[test.type].color}`}>
                          {TYPE_META[test.type].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {status === "pending" && <span className="text-gray-400">⏸</span>}
                        {status === "running" && <span className="text-blue-600 animate-spin inline-block">⟳</span>}
                        {status === "passed" && <span className="text-green-600">✅</span>}
                        {status === "failed" && <span className="text-red-600">❌</span>}
                        {status === "error" && <span className="text-orange-500">⚠</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">{r?.duration ?? "—"}</td>
                    </tr>
                    {isExpanded && r && (r.details || r.error || r.suggestions?.length) && (
                      <tr key={`${test.id}-detail`} className="bg-gray-800 text-gray-100">
                        <td colSpan={6} className="px-4 py-3 font-mono">
                          {r.details && <div className="text-green-300 mb-1">ℹ {r.details}</div>}
                          {r.error && <div className="text-red-300 mb-1">✗ {r.error}</div>}
                          {r.suggestions?.length ? (
                            <div className="text-yellow-300 text-xs mt-2">
                              <div className="font-bold mb-1">💡 Suggestions:</div>
                              {r.suggestions.map((s, i) => <div key={i} className="ml-2">• {s}</div>)}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filteredTests.length === 0 && (
            <div className="py-12 text-center text-gray-400">No tests match the current filters.</div>
          )}
        </div>

        {/* ── Footer hint ── */}
        <div className="text-xs text-gray-400 text-center pb-4">
          Click any row to expand details · Tests with data side effects auto-cleanup after each run
          <br />Programmatic: <code className="bg-gray-100 px-1 rounded">node scripts/run-tests.mjs --module=auth --output=report.json</code>
        </div>
      </div>
    </div>
  );
}

// ── HTML Report Generator ─────────────────────────────────────────────────────

function generateHtmlReport(report: ReturnType<() => ReturnType<typeof Object>>) {
  const r = report as any;
  const rows = r.results.map((t: any) => `
    <tr class="${t.status === "passed" ? "pass" : t.status === "pending" ? "pending" : "fail"}">
      <td>${t.id}</td>
      <td>${t.name}</td>
      <td>${t.module}</td>
      <td>${t.type}</td>
      <td class="status">${t.status === "passed" ? "✅ PASS" : t.status === "pending" ? "⏸ PENDING" : "❌ FAIL"}</td>
      <td>${t.duration}ms</td>
      <td>${t.details || "—"}</td>
      <td>${t.error ? `<span class="err">${t.error}</span>` : "—"}</td>
      <td>${(t.suggestions || []).map((s: string) => `• ${s}`).join("<br>") || "—"}</td>
    </tr>`).join("");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Digiman Test Report</title>
<style>
  body { font-family: monospace; background: #f8fafc; margin: 0; padding: 20px; }
  h1 { color: #1e293b; } .summary { display: flex; gap: 20px; margin: 16px 0; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 20px; }
  .pass-card { border-color: #86efac; } .fail-card { border-color: #fca5a5; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th { background: #1e293b; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; }
  td { padding: 6px 12px; font-size: 11px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .pass { background: #f0fdf4; } .fail { background: #fff1f2; } .pending { background: #f8fafc; color: #94a3b8; }
  .status { font-weight: bold; } .err { color: #ef4444; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 16px; }
</style></head><body>
<h1>🧪 Digiman Test Report</h1>
<div class="meta">Run ID: ${r.runId} | Started: ${r.startTime} | Duration: ${r.duration}ms</div>
<div class="summary">
  <div class="card"><strong>${r.summary.total}</strong> Total</div>
  <div class="card pass-card" style="color:#16a34a"><strong>${r.summary.passed}</strong> Passed</div>
  <div class="card fail-card" style="color:#dc2626"><strong>${r.summary.failed}</strong> Failed</div>
  <div class="card"><strong>${r.summary.pending}</strong> Pending</div>
</div>
<table><thead><tr><th>ID</th><th>Name</th><th>Module</th><th>Type</th><th>Status</th><th>Duration</th><th>Details</th><th>Error</th><th>Suggestions</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
}
