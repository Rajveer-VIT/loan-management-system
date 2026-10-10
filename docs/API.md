# API Reference

Base URL: `/api/v1`. Authenticated routes need `Authorization: Bearer <jwt>`.

**Success:** `{ "success": true, "message"?, "data", "pagination"? }`
**Error:** `{ "success": false, "message", "code", "errors"?: [{ "field"?, "rule"?, "message" }] }`

| Status | Codes |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_ID`, `MALFORMED_JSON`, `INVALID_FILE_TYPE`, `INVALID_FILE_CONTENT`, `FILE_TOO_LARGE`, `FILE_REQUIRED`, `OVERPAYMENT`, `INVALID_PAYMENT_DATE` |
| 401 | `UNAUTHENTICATED`, `INVALID_TOKEN`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` (authenticated, role not allowed) |
| 404 | `NOT_FOUND` (also used for other borrowers' resources) |
| 409 | `DUPLICATE_EMAIL`, `DUPLICATE_UTR`, `INVALID_TRANSITION`, `INVALID_STEP`, `INVALID_STATUS`, `OPEN_LOAN_EXISTS` |
| 413 | `PAYLOAD_TOO_LARGE` |
| 422 | `BRE_VALIDATION_FAILED` (`errors[]` lists every failed rule with `rule` and `field`) |

List endpoints accept `page` (default 1), `limit` (default 10, max 50) and `search` (name/PAN; name/email for Sales) and return `pagination: { page, limit, total, totalPages, hasNext, hasPrev }`.

## Auth

| Method | Path | Roles | Body | Notes |
|---|---|---|---|---|
| POST | `/auth/signup` | public | `{ name, email, password (8–72) }` | Always creates a BORROWER. 201 `{ user, token }` |
| POST | `/auth/login` | public | `{ email, password }` | 200 `{ user, token }` |
| GET | `/auth/me` | any | — | Current user |

## Borrower (BORROWER only)

| Method | Path | Body | Result |
|---|---|---|---|
| GET | `/borrower/loans/draft` | — | `{ draftLoan, currentStep: 'personal' \| 'salary-slip' \| 'loan-config' }` |
| POST | `/borrower/profile` | `{ fullName, pan, dob: 'YYYY-MM-DD', monthlySalary, employmentMode }` | Runs BRE; 422 on failure; creates/updates the single DRAFT |
| POST | `/borrower/loans/:id/salary-slip` | multipart `file` (PDF/JPG/PNG ≤ 5 MB) | Attaches slip (replaces previous) |
| POST | `/borrower/loans/:id/apply` | `{ amount, tenureDays }` (integers) | DRAFT → APPLIED; server computes SI/total |
| GET | `/borrower/loans` | — | Own loans |
| GET | `/borrower/loans/:id` | — | `{ loan, payments }` (own only) |

## Sales (SALES, ADMIN)

| Method | Path | Notes |
|---|---|---|
| GET | `/sales/leads?stage=REGISTERED\|PROFILE_SAVED\|SLIP_UPLOADED` | Borrowers who have not submitted an application: `{ id, name, email, createdAt, lastActivityAt, stage }` |
| GET | `/sales/stats` | `{ totalLeads, newLeadsToday, convertedBorrowers, funnel }` |

## Sanction (SANCTION, ADMIN)

| Method | Path | Body | Transition |
|---|---|---|---|
| GET | `/sanction/loans`, `/sanction/loans/:id`, `/sanction/stats` | — | APPLIED queue (oldest first) |
| PATCH | `/sanction/loans/:id/approve` | — | APPLIED → SANCTIONED (`sanctionedBy/At`) |
| PATCH | `/sanction/loans/:id/reject` | `{ rejectionReason (10–500 chars) }` | APPLIED → REJECTED (`rejectedBy/At`) |

## Disbursement (DISBURSEMENT, ADMIN)

| Method | Path | Transition |
|---|---|---|
| GET | `/disbursement/loans`, `/disbursement/loans/:id`, `/disbursement/stats` | SANCTIONED queue |
| PATCH | `/disbursement/loans/:id/disburse` | SANCTIONED → DISBURSED (`disbursedBy/At`) |

## Collection (COLLECTION, ADMIN)

| Method | Path | Body / notes |
|---|---|---|
| GET | `/collection/loans?status=DISBURSED\|CLOSED\|ALL` | Default `DISBURSED` |
| GET | `/collection/loans/:id` (alias `/payments`) | `{ loan, payments }` |
| GET | `/collection/stats` | `{ activeDisbursedCount, closedCount, totalOutstanding, totalCollected }` |
| POST | `/collection/loans/:id/payments` | `{ utrNumber, amount, paymentDate: 'YYYY-MM-DD' }` → 201 `{ payment, loan, isClosed }`; DISBURSED → CLOSED when balance hits 0 |

## Documents

| Method | Path | Roles |
|---|---|---|
| GET | `/loans/:id/salary-slip` | ADMIN, SANCTION, DISBURSEMENT, owning BORROWER (403 for SALES/COLLECTION) |

## Health

`GET /health` (public) → `{ success, status: 'OK', timestamp }`
