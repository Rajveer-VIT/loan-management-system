# FinFlow LMS — Loan Management System

A full-stack lending platform: borrowers apply for loans through a multi-step portal, and internal teams move each loan through its lifecycle on a role-guarded operations dashboard.

- **Frontend:** Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS
- **Backend:** Node.js · Express · TypeScript (strict)
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (HS256) + bcrypt

```
lms/
├── client/            Next.js app (borrower portal + operations dashboard)
│   └── src/{app,components,context,hooks,lib,types}
├── server/            Express API
│   └── src/{config,constants,middleware,models,modules/<feature>,services,utils,scripts,__tests__}
└── docs/              API reference, architecture, requirements audit, progress report
```

## Prerequisites

- Node.js 18+ (tested on 24) and npm
- MongoDB 6+ running locally (tested on 8.0, standalone — no replica set needed)

## Setup

```bash
# 1. API
cd server
cp .env.example .env          # set JWT_SECRET to a long random value
npm install
npm run seed                  # creates one account per role + demo loans (safe to re-run)
npm run dev                   # http://localhost:5000  (health: /health)

# 2. Web app (new terminal)
cd client
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm install
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `PORT` | server | `5000` | API port |
| `NODE_ENV` | server | `development` | `production` enforces a strong `JWT_SECRET` and blocks seeding |
| `MONGODB_URI` | server | `mongodb://127.0.0.1:27017/lms` | Database |
| `JWT_SECRET` | server | — (required) | ≥16 chars; ≥32 and non-placeholder in production |
| `JWT_EXPIRES_IN` | server | `1d` | Token lifetime |
| `CLIENT_URL` | server | `http://localhost:3000` | Allowed CORS origin(s), comma-separated |
| `UPLOAD_DIR` | server | `uploads` | Salary-slip storage (never served statically) |
| `NEXT_PUBLIC_API_URL` | client | `http://localhost:5000/api/v1` | API base URL |

## Login credentials (created by `npm run seed`)

| Role | Email | Password | Can access |
|---|---|---|---|
| Admin | `admin@lms.com` | `Admin@123` | Overview + all four modules |
| Sales | `sales@lms.com` | `Sales@123` | Sales |
| Sanction | `sanction@lms.com` | `Sanction@123` | Sanction |
| Disbursement | `disbursement@lms.com` | `Disburse@123` | Disbursement |
| Collection | `collection@lms.com` | `Collect@123` | Collection |
| Borrower | `borrower@lms.com` | `Borrower@123` | Borrower portal (`/apply`, `/my-loans`) |

The seed also creates demo borrowers (password `Borrower@123`) with loans in every stage. Re-running it resets the six accounts' passwords but never modifies or deletes existing loans. `borrower@lms.com` starts with no loan so the full journey can be demonstrated; after one application is open, sign up a new borrower to demo again.

## Business rules

**BRE (server-authoritative; the client mirror is only for instant feedback).** An application is blocked if *any* rule fails, and all failures are returned at once (HTTP 422, `BRE_VALIDATION_FAILED`):

| Rule | Rejected when |
|---|---|
| Age | not 23–50 inclusive (completed years on today's date in Asia/Kolkata) |
| Salary | monthly salary < ₹25,000 |
| PAN | not `^[A-Z]{5}[0-9]{4}[A-Z]$` after trimming and upper-casing |
| Employment | `UNEMPLOYED` |

**Loan math.** `SI = (P × R × T) / (365 × 100)`, R = 12, T in days; `Total = P + SI`. P ∈ ₹50,000–₹5,00,000 (whole rupees), T ∈ 30–365 days (integer). Computed on the server in integer paise and rounded to 2 dp; client-sent figures are ignored.

**Payments.** UTR is unique (database index), 6–30 letters/digits. Amount > 0, ≤ 2 dp, ≤ outstanding balance. Date must be between the disbursal date and today. The loan closes automatically, in the same atomic write, when the outstanding balance reaches 0.

## Loan lifecycle

```
DRAFT ──(borrower applies)──▶ APPLIED ──(Sanction approves)──▶ SANCTIONED ──(Disbursement)──▶ DISBURSED ──(payment clears balance)──▶ CLOSED
                                  └──(Sanction rejects, reason required)──▶ REJECTED
```

Every transition is an atomic, status-conditional update (so double-clicks and concurrent executives can't double-apply it; the loser gets 409) and is appended to the loan's `statusHistory` audit trail with actor and time. A borrower may have one open loan (APPLIED/SANCTIONED/DISBURSED) at a time.

## Security & RBAC

- Roles are stored on the user document. `authenticate` verifies the JWT and **reloads the user from the database on every request**, so role changes and deactivation take effect immediately.
- `authorize([...roles])` lists allowed roles per route (no implicit Admin bypass; borrower routes exclude staff). **401** = not authenticated, **403** = authenticated but not permitted.
- Borrowers only ever see their own loans and slips (other borrowers' resources return 404).
- The frontend mirrors the same role map (`client/src/lib/access.ts`) to guard routes and build navigation; this is UX only — the API enforces everything.
- Uploads: extension + MIME whitelist, 5 MB limit, **magic-byte content check**, random server-side file names, rejected files deleted, salary slips streamed only to Admin/Sanction/Disbursement/owner.
- Helmet, CORS allow-list, 100 kB JSON limit, auth rate limiting, consistent JSON error envelope.

## Tests

```bash
cd server
npm test                  # unit tests (no database)
npm run test:integration  # API tests against MongoDB database "lms_test" (wiped each run)
npm run test:all
npm run typecheck && npm run build

cd client
npm test                  # unit tests (BRE mirror, calculator, access map, validators)
npm run typecheck && npm run build
```

Integration tests run the real Express app over HTTP and cover auth, the full role × endpoint matrix, borrower isolation, BRE, uploads, the complete apply → sanction → disburse → collect → auto-close flow, and concurrency (racing payments, duplicate UTRs, concurrent approve/reject). Override the DB with `MONGODB_TEST_URI` (the name must contain "test").

## API

See [`docs/API.md`](docs/API.md). Base path `/api/v1`.

## Known limitations

- MongoDB is used without multi-document transactions (works on a standalone server). Payment recording uses an insert-then-conditional-update with compensation; a process crash between those two writes could leave a payment record that was not applied to the loan. With a replica set this could be wrapped in a transaction.
- JWTs are stored in `localStorage` (no refresh tokens); logout is client-side.
- Salary slips are stored on local disk.
- The screenshots in `docs/screenshots/` predate the UI redesign.

## Submission checklist

- [ ] Push the repo; add the evaluator if private.
- [ ] Confirm `.env` files are not committed (only `.env.example`).
- [ ] Record a 3–5 minute video: BRE fail (e.g. age 20 or Unemployed) → BRE pass → upload slip → configure & apply → Sanction approves → Disbursement disburses → Collection records a partial then the final payment → loan shows **Closed** for the borrower. Show one RBAC denial (e.g. Sanction user opening `/dashboard/collection`).
- [ ] Share the credentials table above.
