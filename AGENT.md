# AGENT.md — Dues Management System

You are working on a **centralized membership, contribution, payment, and welfare
management system** for a Nigerian volunteer organization (~5,000 members).
Read `ARCHITECTURE.md` and `BUILD_PLAN.md` in this repo before writing any code —
they are the source of truth for schema, API surface, and phase order.

## Project Context
- Org hierarchy: Central Management → Zone → Unit → Sub-Unit → Member
- Only staff have accounts (Central/Zone/Unit/Sub-Unit management + Collector).
  Members never log in — they exist only as DB records and interact only through
  a secure, single-use, expiring payment link.
- Due amount is per member **category/rank**, configurable, not hardcoded.
- Contributions are **binary PAID/UNPAID** — there is no partial-payment feature.
  Do not add partial-payment logic even if it seems like an easy extension.
- Cash payments have **no offline mode** — Collector must be online.

## Tech Stack (do not substitute without asking)
- Backend: Node.js + Express.js, REST API
- Frontend: React.js
- Database: MySQL (use a migration tool — Knex or Sequelize; do not hand-write
  schema changes without a migration file)
- Auth: JWT + bcrypt/Argon2, RBAC middleware
- Payment gateway: Paystack or Flutterwave
- Hosting target: Hostinger Business (Web App Hosting) — persistent Node process,
  deployed via GitHub integration. No SSH-based manual deploy steps.

## Non-Negotiable Rules
1. **Never trust the frontend for payment success.** Every payment is only marked
   SUCCESS after the backend independently verifies with the gateway (reference,
   amount, currency, status all match).
2. **Webhook processing must be idempotent.** Rely on the UNIQUE constraint on
   `payments.transaction_reference` — do not add your own dedup logic that could
   race with it.
3. **Duplicate payment prevention is enforced at the DB level** via
   `UNIQUE(member_id, contribution_period_id)` on `member_contributions`. App-level
   checks are a UX nicety, not the real guard — never remove the DB constraint.
4. **Refunds only through the defined flow**: Central Management approval →
   `payments.status = REFUNDED` (row kept, never deleted) →
   `member_contributions.status = UNPAID`, both writes in one DB transaction,
   plus an `audit_logs` entry. No other code path may change a payment to REFUNDED.
5. **Hierarchical authorization is enforced server-side on every query** — a
   Zone user's queries must be scoped by `zone_id` at the SQL/query-builder level,
   not filtered client-side.
6. **Rate limit the public member-code entry step** on payment links using
   `payment_links.attempt_count` / `locked_until` — do not skip this for "MVP speed."
7. **Every financial or administrative action is audit-logged**: payments, refunds,
   member creation/edits, payment-link generation, role/user changes.
8. Do not introduce offline/local-storage payment queuing for Collectors.

## Coding Conventions
- REST endpoints follow the API surface in `ARCHITECTURE.md` §6 — extend it,
  don't diverge from its shape without flagging why.
- All money values: `DECIMAL(10,2)` in MySQL, handled as strings/decimals in
  JS (avoid floating point for currency).
- Environment variables for all secrets/config (DB creds, JWT secret, gateway
  keys, webhook secret) — never hardcoded.
- Write a migration for every schema change; never edit a table ad hoc.

## Working Style
- Build one phase from `BUILD_PLAN.md` at a time. Confirm a phase is working
  (and note how you tested it) before starting the next.
- If a requirement is ambiguous or missing, ask rather than assume — especially
  around money, refunds, or access control.
