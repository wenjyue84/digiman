# PRD: Digiman Test Suite Bug Fixes

**Feature:** Fix 5 confirmed bugs discovered by the developer test suite at `/test` and `scripts/run-tests.mjs`
**Source:** `test-report.json` — 19/47 tests passing (40.4% success rate)
**Target:** 40+/47 tests passing after fixes

---

## 1. Introduction / Overview

Running `node scripts/run-tests.mjs` against the Digiman hotel management system (localhost:5000) produced 28 failures. Root-cause analysis identified 5 distinct bugs:

| # | Bug | Severity | Tests Affected |
|---|-----|----------|---------------|
| BUG-001 | Missing `GET /api/guests`, `POST /api/guests`, `DELETE /api/guests/:id` REST endpoints | HIGH | ~20 failures cascade |
| BUG-002 | `POST /units/:number/mark-cleaned` requires `cleanedBy` body param but rejects empty body with 400 | MEDIUM | UN-005 |
| BUG-003 | Default admin credentials (admin/admin) rejected in dev environment | HIGH | ~10 auth cascade failures |
| BUG-004 | Negative expense amounts accepted without validation | MEDIUM | ED-008 |
| BUG-005 | Invalid date string in `expectedCheckoutDate` accepted without validation | MEDIUM | ED-007 |

All fixes are backend-only (server/routes/, server/init-db.ts, shared/schema-validation.ts). No UI changes required.

---

## 2. Goals

- Raise test suite pass rate from 19/47 (40.4%) to 40+/47 (85%+)
- Expose standard RESTful guest CRUD endpoints that are currently missing
- Harden input validation so malformed data is rejected with 400 (not 200 or 500)
- Ensure dev environment always has a known admin user for testing
- Zero regressions in existing functionality (UI, Rainbow AI, booking flow)

---

## 3. User Stories

---

### US-001: Add Missing RESTful Guest CRUD Endpoints

**Description:** As a developer or API consumer, I want standard REST endpoints (`GET /api/guests`, `POST /api/guests`, `DELETE /api/guests/:id`) so that I can list, create, and delete guests using a predictable RESTful interface.

**Background:**
`server/routes/guests.ts` has sub-routes (`/checkin`, `/checked-in`, `/history`, `/:id PATCH`) but is missing root-level REST handlers. The base route `GET /api/guests` returns 404. The test suite confirms:
- `GET /api/guests` → 404 (expected 200 or 401)
- `POST /api/guests` → 404 (expected 201)
- `DELETE /api/guests/:id` → 404 (expected 200/204)

**Acceptance Criteria:**
- [ ] `GET /api/guests` (with valid auth token) returns HTTP 200 and an array (or paginated object) of all guests
- [ ] `GET /api/guests` without auth token returns HTTP 401
- [ ] `GET /api/guests?search=Ahmad` filters by guest name (delegates to existing storage method)
- [ ] `POST /api/guests` with valid guest payload (same schema as `POST /api/guests/checkin`) returns HTTP 201 and the created guest object with an `id` field
- [ ] `POST /api/guests` without `name` field returns HTTP 400 (Zod validation error)
- [ ] `DELETE /api/guests/:id` with valid auth token and existing guest id returns HTTP 200 or 204
- [ ] `DELETE /api/guests/:id` with non-existent id returns HTTP 404
- [ ] Existing routes (`/checked-in`, `/history`, `/checkin`, `/:id PATCH`, `/checkout-overdue`) still return the same responses as before (no regressions)
- [ ] TypeScript compiles with zero errors (`npm run check`)
- [ ] Test assertions GU-001, GU-002, GU-004, GU-005 now pass when running `node scripts/run-tests.mjs`

**Implementation Notes:**
- `GET /api/guests` should use `storage.getAllGuests()` or the equivalent pagination-aware method already in the storage interface
- `POST /api/guests` should reuse the same handler logic as `POST /api/guests/checkin` (same Zod schema `insertGuestSchema`, same `authenticateToken` middleware)
- `DELETE /api/guests/:id` should call `storage.deleteGuest(id)` — verify this method exists in both PostgreSQL and Memory storage implementations
- Place handlers **before** the `/:id` wildcard route to avoid shadowing
- Require `authenticateToken` on GET, POST, DELETE

---

### US-002: Make cleanedBy Optional in mark-cleaned Endpoint

**Description:** As a developer or automated system, I want to call `POST /api/units/:number/mark-cleaned` without a body so that cleaning can be triggered programmatically without knowing the cleaner's name.

**Background:**
`server/routes/units.ts` line 259 uses a strict Zod schema requiring `cleanedBy: string (min 1)`. Sending `{}` or no body returns HTTP 400. This breaks automated scripts and the test runner which don't always have a cleaner name.

**Acceptance Criteria:**
- [ ] `POST /api/units/C1/mark-cleaned` with empty body `{}` returns HTTP 200 (not 400)
- [ ] When `cleanedBy` is not provided, the unit record stores `"Staff"` as the cleaner name
- [ ] `POST /api/units/C1/mark-cleaned` with `{ "cleanedBy": "Ahmad" }` still works and stores "Ahmad"
- [ ] `POST /api/units/C1/mark-cleaned` with `{ "cleanedBy": "" }` (empty string) returns HTTP 400 (empty string still invalid)
- [ ] `POST /api/units/INVALID/mark-cleaned` returns HTTP 404 for non-existent unit number
- [ ] TypeScript compiles with zero errors
- [ ] Test UN-005 passes: `POST /units/{firstUnit.number}/mark-cleaned` with `{}` returns 200

**Implementation Notes:**
- In `server/routes/units.ts` around line 260, change:
  ```typescript
  cleanedBy: z.string().min(1, "Cleaner name is required").max(50)
  ```
  to:
  ```typescript
  cleanedBy: z.string().min(1).max(50).optional().default("Staff")
  ```
- No changes needed to storage layer (markUnitCleaned already accepts cleanedBy string)

---

### US-003: Seed Default Admin User for Dev/Test Environment

**Description:** As a developer running the test suite, I want a guaranteed admin user with known credentials (`admin` / `admin`) to exist in the dev database so that auth-dependent tests can pass without manual setup.

**Background:**
`POST /api/auth/login` with `{ email: "admin", password: "admin" }` returns 401 in the current dev environment. This causes 10+ cascading test failures (AU-001, AU-005, AU-007, DA-001 to DA-003, SE-001, SE-002, FI-001–003, PR-001–003).

The storage initialization (`server/init-db.ts` or `server/Storage/`) should ensure a dev admin user exists. This must be idempotent (safe to run multiple times).

**Acceptance Criteria:**
- [ ] After server startup, `POST /api/auth/login` with `{ "email": "admin", "password": "admin" }` returns HTTP 200 with a `token` and `user` object
- [ ] The admin user has `role: "admin"` and `email: "admin@pelangi.com"` (or `username: "admin"`)
- [ ] Seeding is idempotent: running twice does not create duplicate users or throw errors
- [ ] The seed only runs in development mode (`NODE_ENV !== 'production'`) OR when `DATABASE_URL` is set to a dev database
- [ ] Password is stored as a bcrypt hash (not plain text)
- [ ] Existing users in the database are NOT modified or deleted
- [ ] TypeScript compiles with zero errors
- [ ] Test AU-001 passes: login with admin/admin returns 200 + token
- [ ] Add a `npm run seed:admin` script to `package.json` so developers can reset the admin password manually

**Implementation Notes:**
- Check `server/init-db.ts` first — there may already be a seeding function
- Use `storage.getUserByUsername("admin")` to check existence before creating
- Use `hashPassword("admin")` from `server/lib/password.ts` for bcrypt hashing
- The MemStorage (in-memory fallback) already seeds sample data — check if it seeds an admin user too
- Also add to `server/Storage/Memory.ts` constructor if not already seeding admin there

---

### US-004: Reject Negative Expense Amounts

**Description:** As the system, I want to reject expense records with negative or zero amounts so that financial data remains accurate and auditable.

**Background:**
`POST /api/expenses` with `{ amount: "-50.00" }` returns HTTP 200 and stores the negative value. The Zod schema for expenses does not validate that `amount` must be positive. Test ED-008 confirms this:
```
ED-008: Negative expense amount → accepted (no validation) ❌
```

**Acceptance Criteria:**
- [ ] `POST /api/expenses` with `{ amount: "-50.00" }` returns HTTP 400 with a message like "Amount must be a positive number"
- [ ] `POST /api/expenses` with `{ amount: "0" }` returns HTTP 400
- [ ] `POST /api/expenses` with `{ amount: "0.01" }` returns HTTP 200 (minimum valid amount)
- [ ] `POST /api/expenses` with `{ amount: "99.50" }` still returns HTTP 200 (existing valid behavior unchanged)
- [ ] `PUT /api/expenses/:id` also rejects negative amounts (same validation applies to update)
- [ ] TypeScript compiles with zero errors
- [ ] Test ED-008 passes: `POST /api/expenses` with `amount: "-50.00"` returns 400

**Implementation Notes:**
- Find the expense Zod schema in `shared/schema-validation.ts` or `server/routes/expenses.ts`
- Add `.refine()` to the `amount` field:
  ```typescript
  amount: z.string().refine(
    v => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
    { message: "Amount must be a positive number" }
  )
  ```
- Apply the same validation to the update schema if it's separate from the insert schema

---

### US-005: Validate expectedCheckoutDate Format in Guest Check-in

**Description:** As the system, I want to reject guest check-ins with invalid `expectedCheckoutDate` values so that booking records always contain parseable dates.

**Background:**
`POST /api/guests/checkin` with `{ expectedCheckoutDate: "not-a-date" }` returns HTTP 200 and stores the invalid string. This can cause date arithmetic to fail silently (overdue calculations, calendar rendering, etc.). Test ED-007 confirms:
```
ED-007: Invalid date format → accepted (no validation) ❌
```

**Acceptance Criteria:**
- [ ] `POST /api/guests/checkin` with `expectedCheckoutDate: "not-a-date"` returns HTTP 400 with message about invalid date format
- [ ] `POST /api/guests/checkin` with `expectedCheckoutDate: "2026-13-99"` returns HTTP 400 (invalid calendar date)
- [ ] `POST /api/guests/checkin` with `expectedCheckoutDate: "2026-06-15"` (valid ISO date) returns HTTP 200 (existing behavior unchanged)
- [ ] `POST /api/guests/checkin` where `expectedCheckoutDate` is omitted entirely is still allowed (field remains optional)
- [ ] The same validation applies via the new `POST /api/guests` endpoint (US-001)
- [ ] TypeScript compiles with zero errors
- [ ] Test ED-007 passes: invalid date returns 400 (not 200 or 404)

**Implementation Notes:**
- Find `insertGuestSchema` in `shared/schema-validation.ts`
- Change the `expectedCheckoutDate` field to validate format:
  ```typescript
  expectedCheckoutDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine(v => !isNaN(new Date(v).getTime()), "Invalid date")
    .optional()
  ```
- Check that the UI's date picker always sends ISO format strings (it should since it uses `toISOString().split('T')[0]` pattern)
- Verify no existing guest records would fail this validation if the schema is applied to updates

---

## 4. Functional Requirements

- **FR-1:** `GET /api/guests` MUST require authentication (Bearer token) and return a list of all guest records
- **FR-2:** `POST /api/guests` MUST require authentication and behave identically to `POST /api/guests/checkin`
- **FR-3:** `DELETE /api/guests/:id` MUST require authentication and remove the guest record
- **FR-4:** `POST /api/units/:number/mark-cleaned` MUST accept an empty body and default `cleanedBy` to "Staff"
- **FR-5:** A dev admin user (`username: admin`, `password: admin`) MUST exist after server startup in non-production environments
- **FR-6:** Expense `amount` field MUST reject values that are not positive decimal numbers (via Zod schema)
- **FR-7:** Guest `expectedCheckoutDate` MUST reject strings that are not valid YYYY-MM-DD format

---

## 5. Non-Goals (Out of Scope)

- No UI changes — all fixes are backend-only
- No Rainbow AI changes
- No new features beyond what's described — do not add rate limiting, caching, or logging
- Do not change the guest `/checkin` route — it should remain at its current path alongside the new `POST /api/guests`
- Do not modify production database or seed data in production
- Do not change the authentication strategy (Bearer token sessions)

---

## 6. Technical Considerations

- **Storage duality:** Digiman has two storage backends — `PostgreSQL.ts` (Drizzle ORM) and `Memory.ts` (in-memory fallback). Any `deleteGuest(id)` method must be implemented in BOTH. Check `server/Storage/` for existing patterns.
- **Shared schema:** `insertGuestSchema` is in `shared/schema-validation.ts` and used by both frontend (React Hook Form) and backend (Zod validation). Changes to required/optional fields must not break the existing check-in UI form.
- **TypeScript strict mode:** All code must compile cleanly with `npm run check`
- **Express route ordering:** New `GET /`, `POST /`, `DELETE /:id` handlers in guests.ts must be placed BEFORE the existing `PATCH /:id` wildcard or Express will route incorrectly
- **bcrypt dependency:** `server/lib/password.ts` already exports `hashPassword()` — use it directly for admin seeding

---

## 7. Success Metrics

| Metric | Before | Target |
|--------|--------|--------|
| `node scripts/run-tests.mjs` pass rate | 19/47 (40.4%) | 40+/47 (85%+) |
| GU-001 (list guests) | ❌ 404 | ✅ 200 |
| GU-004 (create guest) | ❌ 404 | ✅ 201 |
| AU-001 (admin login) | ❌ 401 | ✅ 200 |
| UN-005 (mark cleaned) | ❌ 400 | ✅ 200 |
| ED-008 (negative amount) | ❌ accepted | ✅ 400 |
| ED-007 (invalid date) | ❌ accepted | ✅ 400 |

---

## 8. Open Questions

- **Q1:** Should `GET /api/guests` support the same pagination parameters (`page`, `limit`, `search`) as the history endpoint, or return all guests flat? _(Recommend: match history endpoint pagination for consistency)_
- **Q2:** Should `DELETE /api/guests/:id` do a hard delete or soft delete (set a `deletedAt` field)? _(Recommend: hard delete to match existing storage.deleteGuest pattern if it exists)_
- **Q3:** The admin seeding requirement says non-production only — should it also check for `NODE_ENV=development` or just rely on DATABASE_URL pattern? _(Recommend: seed whenever `NODE_ENV !== 'production'`)_
