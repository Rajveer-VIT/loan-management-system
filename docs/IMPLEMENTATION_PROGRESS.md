# Implementation Progress & Final Compliance

Baseline gaps are listed in [`REQUIREMENTS_AUDIT.md`](./REQUIREMENTS_AUDIT.md). This file records what was changed and the evidence.

## Verification evidence (2026-10-10, Node 24.11, MongoDB 8.0.4 standalone)

| Command | Result |
|---|---|
| `server: npx tsc --noEmit` | pass |
| `server: npm run test:all` | **215/215 pass** (7 files: 61 unit, 154 integration over HTTP against `lms_test`) |
| `server: tsc` build | pass |
| `server: npm run seed` ×2 on a scratch DB | 8 demo loans first run, 0 on rerun (idempotent); production guard verified |
| `client: npx tsc --noEmit` | pass |
| `client: npm test` | **60/60 pass** |
| `client: next build` | pass (14 routes) |
| Mutation check | Removing the `outstandingBalance ≥ amount` guard makes the concurrent-overpayment test fail → the test is meaningful |
| Browser E2E | **Not run.** A Playwright script was written, but the local Edge build would not launch under Playwright 1.47 (`--headless` incompatibility). UI flows were verified by build + typecheck + unit tests only |

## Final compliance matrix

| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1–2 | Stack (Next.js/TS/Tailwind, Express/TS, MongoDB/Mongoose, JWT/bcrypt) | PASS | builds |
| 3 | Sign up / login, hashed passwords | PASS | `auth.test.ts` (bcrypt hash, role forced, dup email, timing-equal 401) |
| 4 | Protect all other pages | PASS (code) / UNVERIFIED (browser) | `RouteGuard` on borrower + dashboard layouts; `access.ts` unit tests |
| 5–9 | Personal details + 4 BRE rules | PASS | `bre.test.ts` boundaries (23/50, ₹25,000, PAN list, Unemployed, invalid/future DOB, IST day); `lifecycle.test.ts` 422 per rule |
| 10 | BRE on server, blocks application, clear errors | PASS | All failures returned with `field`; re-run at submit; client shows inline + summary |
| 11 | Slip upload PDF/JPG/PNG ≤ 5 MB, linked | PASS | type, content-sniff, size, traversal, cleanup, replacement tests |
| 12 | Sliders + live calculation | PASS (code) / UNVERIFIED (browser) | clamped inputs; calculator parity tests client/server |
| 13 | SI formula, total | PASS | `loanCalculator.test.ts` incl. every tenure 30–365 |
| 14 | Apply → pending (APPLIED) | PASS | server-computed terms, double-submit 409, concurrent apply → one success |
| 15 | Sales: pre-application leads | PASS | stage progression test; applied borrower leaves list; no PAN exposed |
| 16 | Sanction approve / reject with reason | PASS | transitions, reason ≥ 10 chars, actor recorded, concurrent decisions → one wins |
| 17 | Disbursement → DISBURSED | PASS | once only; wrong-state 409 |
| 18 | Collection: unique UTR, amount, date | PASS | dup UTR (incl. concurrent, cross-loan), 0/negative/3-dp/overpay, future/pre-disbursal date, **same-day payment** |
| 19–20 | Auto-close; outstanding tracking | PASS | partial → balance; final → CLOSED; racing payments never overpay; exactly one close |
| 21–25 | Roles, module isolation, Admin all, borrower blocked, 401/403 | PASS (API) / PASS (code, frontend) | full role × endpoint matrix in `rbac.test.ts`; DB role reload; deactivation revokes |
| 26 | Seed script, known credentials | PASS | idempotent runs; README table |
| 27–29 | Data model, REST design, transitions | PASS | `statusHistory` audit trail; `docs/API.md` |
| 30 | README + `.env.example` | PASS | rewritten; placeholder secret; `*.tsbuildinfo` untracked |
| 32 | UI/UX + responsiveness | PARTIAL / UNVERIFIED | redesigned, a11y (labels, dialogs, focus trap, aria), mobile nav — not checked in a real browser |

## Changes made (summary)

**Server.** Shared ObjectId validation and pagination parser; JSON 404 and full error mapping (CastError, ValidationError, Multer, malformed JSON); strict `authorize(roles)` with no Admin bypass; `authenticate` reloads the user each request; HS256 pinned; env validation with production guards; BRE on calendar dates in Asia/Kolkata with field-tagged failures; integer-paise calculator; one-draft-per-borrower unique index; `statusHistory`, `appliedAt`, `rejectedBy/At`; atomic status transitions via `services/loanQueue.ts`; atomic payment pipeline with compensation; Sales rewritten as pre-application funnel with `$facet`; upload magic-byte checks, cleanup, safe `Content-Disposition`, no disk path in responses; idempotent, non-destructive seed with real demo PDF and production guard; integration test suite.

**Client.** Shared role map + `RouteGuard`; deleted no-op `middleware.ts`; removed unused `framer-motion`, `clsx`, `tailwind-merge`; added `vitest`; API error helper; BRE mirror and calculator aligned with server; accessible UI primitives (labelled inputs, dialog semantics, focus trap, confirm dialogs); responsive dashboard nav; module stats from `/stats` endpoints; debounced search; loan detail + audit trail view; approve/disburse confirmations; payment form validation; borrower timeline and payment history; Admin overview; unverifiable marketing claims removed.

**Docs.** `README.md` and `docs/API.md` rewritten; `docs/ARCHITECTURE.md` annotated; this report.

## Remaining before submission

1. Run the UI flow once by hand (or record the demo video, which doubles as the browser check).
2. Restart your local `next dev` after deleting `client/.next` (verification builds wrote into it).
3. Commit and push; record the 3–5 minute video; share credentials.
