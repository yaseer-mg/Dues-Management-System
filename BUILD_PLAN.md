# Build Plan — Centralized Dues Management System

Work through phases in order. Within a phase, complete steps in order. Do not
start a phase's step until the previous step is working. Confirm each phase's
"Done when" criteria before moving to the next phase.

---

## Phase 0 — Project Setup

- [x] 1. Create repo structure: `/backend`, `/frontend`, root `README.md`.
- [x] 2. Init backend: `npm init`, install `express`, `mysql2`, a migration tool
   (Knex or Sequelize — pick one), `dotenv`, `bcrypt` or `argon2`,
   `jsonwebtoken`, `cors`, `helmet`.
- [x] 3. Init frontend: `create-react-app` or Vite React app, install `axios` or
   `fetch`-based API client, `react-router-dom`.
- [x] 4. Set up `.env.example` in `/backend` listing every required variable (DB
   host/user/pass/name, JWT secret, payment gateway keys, webhook secret) —
   no real values.
- [x] 5. Configure MySQL connection module in `/backend` using env vars.
- [x] 6. Set up migration tool config; create a first empty migration to confirm
   the pipeline runs.
- [x] 7. Add `GET /health` endpoint returning `{ status: "ok", db: true/false }`.
- [x] 8. Add basic error-handling middleware and a consistent JSON response shape.

**Done when:** backend starts, connects to MySQL, `/health` returns success,
frontend builds and can call `/health`.

---

## Phase 1: Auth & Org Hierarchy

- [x] 1. Migration: `roles` table; seed the five fixed roles.
- [x] 2. Migration: `zones`, `units`, `sub_units` tables (per `ARCHITECTURE.md` §5).
- [x] 3. Migration: `users` table (staff only), with nullable `zone_id`/`unit_id`/
   `sub_unit_id` scope columns.
- [x] 4. Implement password hashing utility (bcrypt/Argon2).
- [x] 5. Implement `POST /auth/login` — verify credentials, issue JWT containing
   `user_id`, `role`, and scope IDs.
- [x] 6. Implement auth middleware: verifies JWT, attaches `req.user`.
- [x] 7. Implement RBAC middleware: checks `req.user.role` against allowed roles
   per route.
- [x] 8. Implement scope middleware: injects the user's `zone_id`/`unit_id`/
   `sub_unit_id` into query filters automatically (never trust a scope value
   sent from the client).
- [x] 9. CRUD endpoints for `zones`, `units`, `sub_units` — Central Management only
   for create/edit; scoped read access for other roles.
- [x] 10. Frontend: login page, JWT storage, protected route wrapper, basic
     role-based navigation shell.

**Done when:** each of the five roles can log in and see only data within
their own scope; a Zone user cannot read another Zone's data even by
guessing an ID in the URL.

---

## Phase 2 — Members & Categories

- [x] 1. Migration: `contribution_categories` table.
- [x] 2. Endpoint: Central Management CRUD for categories (name, amount, status).
- [x] 3. Migration: `members` table.
- [x] 4. Implement `member_code` auto-generation: create the row first to get its
   `id`, then set `member_code = 'MEM-' + zero-padded id`, then save.
- [x] 5. Endpoint: `POST /members` — Sub-Unit Management only, scoped to their own
   `sub_unit_id`.
- [x] 6. Endpoint: `GET /members/:code` and `GET /members?search=` (by name or
   code), scoped by caller's role (Collector sees only their sub-unit,
   Central sees all, etc.).
- [x] 7. Endpoint: `PATCH /members/:id` — update member details, scoped access.
- [x] 8. Frontend: member registration form, member search/list view, scoped by
   logged-in role.

**Done when:** a Sub-Unit officer can register a member and immediately find
them by code or name; a Collector in a different sub-unit cannot see them.

---

## Phase 3 — Contribution Periods

- [x] 1. Migration: `contribution_periods` table with `UNIQUE(month, year)`.
- [x] 2. Migration: `member_contributions` table with
   `UNIQUE(member_id, contribution_period_id)`.
- [x] 3. Implement "open a period" logic: create the period row, then in one
   transaction insert a `member_contributions` row (status UNPAID) for every
   ACTIVE member, snapshotting `expected_amount` from their current category.
- [x] 4. Expose this as `POST /contribution-periods` (Central Management only) —
   can be triggered manually for now; note in code where a scheduled job
   could call the same function automatically on the 1st of each month.
- [x] 5. Endpoint: `GET /contribution-periods`, `GET /members/:id/contributions`
   (a member's payment history across periods).
- [x] 6. Frontend: view for Central Management to open a new period; view for
   staff to see a member's contribution history.

**Done when:** opening a period creates the correct number of UNPAID rows
(one per active member) with the right snapshotted amount, and running it
twice for the same month does not duplicate rows.

---

## Phase 4 — Cash Payments

- [x] 1. Migration: `payments` table (per `ARCHITECTURE.md` §5), CASH path only
   for this phase.
- [x] 2. Endpoint: `POST /payments/cash` — Collector only, scoped to their own
   sub-unit's members. Body: `member_contribution_id`, `amount`.
- [x] 3. Logic: verify the `member_contributions` row is UNPAID and belongs to the
   Collector's sub-unit → insert `payments` row (method CASH, status
   SUCCESS, `recorded_by`) → update `member_contributions.status = PAID`,
   `paid_at = now()` → all inside one DB transaction.
- [x] 4. Rely on the `UNIQUE(member_id, contribution_period_id)` constraint to
   reject a second payment attempt for an already-PAID period; surface a
   clean error message on that constraint violation.
- [x] 5. Write an `audit_logs` entry for the payment (see Phase 7 table, but you
   can create the table now and start writing to it here).
6. Frontend: Collector dashboard — search member, select unpaid period,
   confirm payment.

**Done when:** a Collector can record a cash payment, the contribution
flips to PAID, and a second attempt for the same period is cleanly rejected.

---

## Phase 5 — Online Payments

1. Migration: `payment_links` table (per `ARCHITECTURE.md` §5).  [x]
2. Endpoint: `POST /payment-links` — Collector only. Generates a random
   token (`crypto.randomBytes`), sets `expires_at` (+30 min), links to the
   target `member_contribution_id`.  [x]
3. Public endpoint: `GET /payment/:token` — returns period/amount info only
   if token is PENDING and not expired.  [x]
4. Public endpoint: `POST /payment/:token/verify-member` — accepts a
   `member_code` guess. On mismatch, increment `attempt_count`; if it hits
   the limit, set `locked_until`. Reject any attempt while `locked_until` is
   in the future. On match, return member info for confirmation.  [x]
5. Public endpoint: `POST /payment/:token/pay` — initiates a transaction
   with the payment gateway (Paystack/Flutterwave), creates a `payments` row
   (status PENDING, method ONLINE).  [x]
6. Implement `POST /api/payments/webhook`:
   - Verify the gateway's signature before doing anything else.
   - Look up the `payments` row by `transaction_reference`.
   - If already SUCCESS, return 200 and do nothing further (idempotency).
   - Otherwise verify amount/currency/status directly with the gateway API
     (never trust the webhook payload alone), then update `payments.status`,
     `member_contributions.status = PAID`, `payment_links.status = USED`,
     all in one transaction.  [x]
7. Frontend: public payment page (token → member code entry → confirm →
   pay), Collector "Generate Link" action with WhatsApp share.

**Done when:** a full online payment, run twice against the same webhook
event, results in exactly one SUCCESS payment and one PAID contribution —
not two.

---

## Phase 6 — Receipts

1. Migration: `receipts` table.
2. On any payment reaching SUCCESS (cash or online), generate a receipt:
   unique `receipt_number`, unique `verification_code`, PDF with QR code
   linking to the public verification page.
3. Endpoint: `GET /receipts/:payment_id` (staff/member-facing download).
4. Public endpoint: `GET /receipt/verify/:verification_code` — returns only
   limited fields (member code, amount, period, date, method, status) —
   never full member profile.
5. Optional: send receipt link via WhatsApp/SMS after generation.
6. Frontend: receipt view/download, public verification page.

**Done when:** every SUCCESS payment has exactly one receipt, and the public
verification page never exposes more than the limited field set.

---

## Phase 7 — Refunds & Audit

1. Migration: `audit_logs` table (if not already created in Phase 4).
2. Ensure every prior write path (member create/edit, payment, link
   generation, login) writes an audit entry — retrofit any that were
   skipped.
3. Endpoint: `POST /payments/:id/refund` — Central Management only. In one
   transaction: set `payments.status = REFUNDED`, `refunded_by`,
   `refunded_at`; set the linked `member_contributions.status = UNPAID`;
   write an audit log entry. Never delete the payment row.
4. Frontend: Central Management refund action with confirmation step and
   reason field (stored in `audit_logs.metadata`).

**Done when:** a refund is fully reversible in the data (contribution
payable again) and fully traceable (who, when, why, on what transaction).

---

## Phase 8 — Dashboards & Reports

1. Central Management dashboard: org-wide totals (members, collected,
   outstanding, by method, by zone).
2. Zone/Unit/Sub-Unit dashboards: same shape, scoped to their level.
3. Collector dashboard: their members, paid/unpaid this month, recent
   payments, quick actions (already partially built in Phase 4/5).
4. Report export endpoints: PDF, Excel, CSV for membership and financial
   reports listed in `ARCHITECTURE.md`.

**Done when:** each role's dashboard numbers are correct and match a manual
SQL check against the same data.

---

## Phase 9 — Deployment

1. Prepare production env vars for Hostinger Business hosting (DB creds,
   JWT secret, gateway live keys, webhook secret).
2. Connect the repo via Hostinger's GitHub integration; configure build/
   start scripts for the Node app.
3. Set up production MySQL database on Hostinger, run all migrations.
4. Point the payment gateway's webhook URL at the deployed backend; test
   with the gateway's test mode first.
5. Verify HTTPS is enforced end-to-end.
6. Run one real, small, end-to-end payment in production and confirm it
   reconciles correctly in the dashboard and audit log.

**Done when:** a real payment made by a real member through a real Collector
link completes successfully and appears correctly everywhere in the system.
