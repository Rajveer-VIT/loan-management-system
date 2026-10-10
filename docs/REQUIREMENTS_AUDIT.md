# Requirements Audit — Baseline (pre-remediation)

Source of truth: `LMS_Assignment.pdf` (5 pages, supplied in the session — not committed to the repo).
Audit date: 2026-10-10. Baseline commit: `9d785bd`.

This document records the state of the codebase **before** remediation. The post-remediation status of every
row, with verification evidence, lives in [`IMPLEMENTATION_PROGRESS.md`](./IMPLEMENTATION_PROGRESS.md).

## Baseline verification commands

| Command | Result at baseline |
|---|---|
| `server: npx tsc --noEmit` | pass |
| `server: npx vitest run` | 19/19 pass (3 files; pure functions only — BRE, calculator, rounding) |
| `client: npx tsc --noEmit` | pass |
| `client: npx next build` | pass (16 static routes) |
| Integration / API tests | none existed |
| Frontend tests | none existed (no test runner installed in `client/`) |

Environment: Node 24.11, MongoDB 8.0.4 **standalone** (no replica set → multi-document transactions unavailable).

## Status legend

- **PASS** — implemented and behaviour verified by reading the code path end to end.
- **PARTIAL** — implemented incompletely or with a defect.
- **FAIL** — missing or incorrect.
- **UNVERIFIED** — code exists, but behaviour was not exercised at baseline (no test / no run).

## Traceability matrix

| # | Requirement | PDF ref | Existing implementation | Status | Gap | Planned fix | Verification |
|---|---|---|---|---|---|---|---|
| 1 | Next.js App Router + TS + Tailwind | §1 | `client/` (Next 14.2, strict TS) | PASS | — | — | build |
| 2 | Express + TS backend, MongoDB + Mongoose, JWT + bcrypt | §1 | `server/src/*` | PASS | — | — | typecheck |
| 3 | Sign up / login, hashed passwords | §2 Step 1 | `modules/auth/*`, bcryptjs cost 10 | PASS | — | add integration tests | API test |
| 4 | Protect all other pages | §2 Step 1 | `dashboard/layout.tsx` guards only; `client/src/middleware.ts` is a **no-op**; `/apply/*` and `/my-loans` have **no guard** | FAIL | Unauthenticated users see the borrower shell; staff can open `/apply/*` | Client `RoleGuard` on borrower and dashboard layouts; delete dead middleware | manual + build |
| 5 | Collect name, PAN, DOB, salary, employment mode | §2 Step 2 | `PersonalDetailsForm.tsx`, `POST /borrower/profile` | PASS | — | — | API test |
| 6 | BRE: age 23–50 | §2 Step 2 | `services/bre.service.ts` | PARTIAL | DOB parsed with `new Date('YYYY-MM-DD')` (UTC) but compared with **local** getters → off-by-one-day in negative-offset time zones; future DOB not explicitly rejected | Parse DOB as calendar date, compare in UTC; reject future/invalid DOB | unit tests at 23/50 boundaries |
| 7 | BRE: salary ≥ ₹25,000 | §2 Step 2 | `bre.service.ts` | PASS | `z.number()` accepts `Infinity` | `.finite()` | unit |
| 8 | BRE: PAN format | §2 Step 2 | regex `^[A-Z]{5}[0-9]{4}[A-Z]$` | PARTIAL | The zod schema rejects bad PANs with a generic 400 "Validation failed" **before** BRE runs, so a PAN failure is reported differently from the other three rules | Make BRE the single authority for PAN; zod checks shape only | API test |
| 9 | BRE: not Unemployed | §2 Step 2 | `bre.service.ts` | PASS | — | — | unit |
| 10 | BRE on server; block application; clear error | §2 Step 2 | 422 `BRE_VALIDATION_FAILED` with `errors[]`; client mirror in `lib/bre.ts` | PARTIAL | Apply step doesn't re-run BRE; client mirror has the same timezone bug; failures carry no `field` for inline display | Re-run BRE at submit; add `field` to failures; fix client mirror | API + unit |
| 11 | Salary slip PDF/JPG/PNG, ≤ 5 MB, linked to application | §2 Step 3 | `middleware/upload.ts` (multer, ext + MIME) | PARTIAL | No content (magic-byte) check — a renamed `.exe` with a spoofed MIME passes; file written to disk **before** ownership/state checks and never cleaned up on failure; replaced slips leak on disk; absolute server path returned to clients; `Content-Disposition` built from raw client filename | Magic-byte sniffing, cleanup on every failure path, delete superseded file, hide `path`, sanitise header | API tests |
| 12 | Sliders ₹50K–₹5L, 30–365 days, 12% p.a., live panel | §2 Step 4 | `loan-config/page.tsx`, `Slider.tsx`, `LoanSummaryPanel.tsx` | PARTIAL | The number box beside each slider accepts out-of-range values, so the panel can show a figure the server will reject | Clamp on blur; disable submit when out of range | manual |
| 13 | SI = P×R×T/(365×100); total = P + SI | §2 Step 4 | `services/loanCalculator.ts` (server authoritative, rounds to 2 dp) | PASS | Duplicate copy in client is acceptable for preview | Tests at range boundaries | unit |
| 14 | Apply → loan created with pending status | §2 Step 4 | `DRAFT → APPLIED` via conditional `findOneAndUpdate` | PARTIAL | Tenure not required to be an integer; concurrent `POST /profile` can create two DRAFTs; no re-check for another open loan at submit | Unique partial index on `{borrower}` for DRAFT; `int()` tenure; open-loan check at submit | API tests |
| 15 | Sales: registered users not yet applied | §3 | `sales.service.ts` | FAIL | Returns **every** borrower including applied/closed; `latestLoan` is `$arrayElemAt[loans,0]` (arbitrary, not latest); `total` counts all users so pagination is wrong once filtered; dashboard stat cards are computed from the current page only | Restrict to pre-application leads with a `$facet` count; use `/sales/stats` for cards | API test |
| 16 | Sanction: approve / reject with reason | §3 | `sanction.service.ts` | PARTIAL | Reject doesn't record **who** rejected or **when**; `rejectedToday` uses `updatedAt`; Approve has no confirmation in the UI | `rejectedBy/rejectedAt`, status history, approve confirmation | API test |
| 17 | Disbursement: SANCTIONED → DISBURSED | §3 | `disbursement.service.ts` | PARTIAL | Routes have no ID validation (malformed ID → 500) | Shared ObjectId validation | API test |
| 18 | Collection: UTR unique, amount, date | §3 | unique index on `utrNumber`; pre-check | PARTIAL | **Same-day payment after disbursal is rejected** (the date-only input is compared with the disbursal timestamp) → **blocks the demo flow**; UTR format unchecked; amounts with >2 decimals accepted | Day-granular date comparison; UTR format; 2-dp check | API test |
| 19 | Auto-close when paid = total repayment | §3 | `collection.service.ts` | PARTIAL | Read-modify-write: two concurrent payments both pass the overpayment check → **overpayment and double counting**; payment inserted before the loan update with no compensation if that update fails | Insert payment (UTR claim) and then one **conditional atomic pipeline update** (`outstanding ≥ amount`, rounding with `$round`, close in the same write); delete the payment if the update loses the race | concurrency API test |
| 20 | Outstanding balance tracking; payment validations | §3 | `totalPaid`/`outstandingBalance` on Loan | PASS (logic) / PARTIAL (race) | see #19 | see #19 | API test |
| 21 | Roles: Admin, Sales, Sanction, Disbursement, Collection, Borrower | §4 | `constants/roles.ts`, `User.role` | PASS | — | — | — |
| 22 | Executive sees only own module; Admin sees all | §4 | `authorize()` + `Sidebar.tsx` | PARTIAL | Backend OK. **Frontend**: any staff role can open any `/dashboard/<module>` URL — the layout only blocks BORROWER | Per-module client guard driven by a shared access map | manual |
| 23 | Borrowers can't access dashboard | §4 | `dashboard/layout.tsx` | PASS | — | — | API + manual |
| 24 | Enforce RBAC on backend | §4 | `authorize()` | PARTIAL | `authorize()` lets **ADMIN through every route**, including borrower routes, so an Admin can create loans as if a borrower; the role is trusted from the JWT, so a deactivated user or a changed role keeps access until the token expires | Explicit role lists; load user from DB on each request | API tests |
| 25 | 401 vs 403 semantics | §4 | `authenticate`=401, `authorize`=403 | PASS | `/auth/me` returns 404 for an inactive user | 401 | API test |
| 26 | Seed one account per role, known credentials | §4 | `scripts/seed.ts` | PARTIAL | Works, but: demo loans reference `demo_salary_slip.pdf`, which doesn't exist (View Slip → 404); no production guard; the CLOSED loan has no `sanctionedAt`/`disbursedAt`; `Record<string, any>` | Create placeholder slip; production guard; complete timestamps and history | run seed |
| 27 | Data model / relationships designed | §5 | User, Loan (embedded personal details and slip), Payment | PASS | No audit trail of transitions | `statusHistory[]` on Loan | API test |
| 28 | REST API design with status codes | §5 | `docs/API.md` | PARTIAL | Unknown routes return Express HTML; `CastError` → 500; Mongoose `ValidationError` → 500; malformed JSON → raw message; NaN `page` → 500 in sanction/disbursement | 404 JSON handler; error mapping; shared pagination parser | API tests |
| 29 | Loan status transitions & who triggers each | §5 | `constants/loanStatus.ts` | PASS (map) | Enforced per service; not documented per role | Document matrix | docs |
| 30 | README with setup + `.env.example` | §6 | `README.md`, both `.env.example` | PARTIAL | README tree lists files that don't exist; `.env.example` contains a realistic-looking JWT secret; `client/tsconfig.tsbuildinfo` is committed | Rewrite README; placeholder secret; untrack build info | review |
| 31 | Login credentials for all roles | §6 | README table + login chips | PASS | — | — | seed run |
| 32 | UI/UX + responsiveness | §6 weight 10% | Tailwind UI | PARTIAL | Dashboard sidebar is a fixed 256 px column → breaks at 375 px; form labels aren't bound to inputs (`htmlFor`); modal has no `role="dialog"`/focus handling; icon buttons lack `aria-label`; search fires a request on every keystroke | Responsive nav, a11y fixes, debounce | manual |

## Prioritised gap list

### P0 — security, data integrity, core-flow blockers
1. Same-day payment rejected (#18) — breaks the required demo flow.
2. Concurrent payments can overpay and double count (#19).
3. Malformed ObjectIds → HTTP 500 across modules (#17, #28).
4. Frontend RBAC: staff can open other modules' pages; borrower pages unguarded (#4, #22).
5. ADMIN passes borrower-only routes; user role and active state not re-checked server side (#24).
6. Upload hardening: content sniffing, orphan cleanup, path disclosure, header injection (#11).

### P1 — required functionality incorrect or incomplete
7. Sales module shows applied borrowers; wrong pagination; stats from current page only (#15).
8. BRE timezone bug and inconsistent PAN error path; no BRE re-check at submit (#6, #8, #10).
9. Rejection audit (who/when) and transition history (#16, #27).
10. Duplicate DRAFT race; integer tenure (#14).
11. Seed: missing demo slip file, prod guard (#26).

### P2 — reliability, tests, accessibility
12. Integration tests against a real MongoDB for auth, RBAC, BRE, upload, lifecycle, payments, concurrency.
13. Client unit tests for BRE mirror, calculator, access map.
14. Error-handler coverage (404 JSON, CastError, ValidationError, JSON syntax, Multer).
15. Accessibility: label binding, dialog semantics, aria-labels, keyboard focus.
16. Responsive dashboard navigation.

### P3 — polish
17. Admin overview page across the four modules.
18. Loan detail drawer with audit timeline in the dashboards.
19. README/docs accuracy, repo hygiene (`tsconfig.tsbuildinfo`, dead `middleware.ts`).
