# Centralized Dues Management System — Architecture & Design

## 1. Overview

A centralized platform for a Nigerian volunteer organization (~5,000 members) to manage membership, monthly dues collection, payments, receipts, and financial reporting across a hierarchical structure: **Central Management → Zone → Unit → Sub-Unit → Member**.

Only staff (Central/Zone/Unit/Sub-Unit management + Collectors) have accounts. Members exist only as records and interact with the system only through secure, single-use payment links.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React.js |
| Backend | Node.js + Express.js (REST API) |
| Database | MySQL |
| Auth | JWT + bcrypt/Argon2, RBAC |
| Payments | Paystack or Flutterwave |
| Hosting | Hostinger Business (Web App Hosting) — persistent Node process, GitHub-integration deploy |
| Messaging | WhatsApp Cloud API / SMS for links & receipts |

## 3. High-Level Architecture

```
React Web App (Desktop/Tablet/Mobile)
        |
        v
Node.js + Express REST API  (persistent process on Hostinger Business)
        |
   -----------------------------------------
   |                |                      |
MySQL DB      Payment Gateway        WhatsApp/SMS
                     |
                     v
              Gateway Webhook
                     |
                     v
          Express Backend Verification
                     |
                     v
             Payment Ledger Update
              /              \
   member_contributions    receipts
        (PAID)             (generated)
```

## 4. Core Principles (locked decisions)

- Staff-only accounts; members are records, not users.
- Due amount is set by **member category/rank**, not sub-unit.
- **No partial payments** — each period is binary PAID/UNPAID.
- **No offline cash recording** — Collector must be online.
- Refunds require **Central Management** approval; approval reverts contribution to UNPAID and keeps the original payment row as `REFUNDED` (never deleted).
- Backend always verifies payments with the gateway — frontend "success" is never trusted.
- Webhook processing is idempotent via a UNIQUE `transaction_reference`.
- Rate limiting on the payment-link member-code entry step (attempt count + lockout).
- `member_contributions` rows are **auto-created in bulk** when a new contribution period opens, snapshotting the member's expected amount at that time.
- `member_code` (index number) is auto-generated from the member's internal id (e.g. `MEM-000231`).
- Each Sub-Unit has exactly one officer account.

## 5. Database Schema (MySQL)

### Access & Org
```
roles(id, name)

zones(id, serial_number, name, status, created_at)

units(id, zone_id FK, serial_number, name, status, created_at)

sub_units(id, unit_id FK, serial_number, name, status, created_at)

users(id, role_id FK, name, phone UNIQUE, email UNIQUE NULL,
      password_hash, zone_id FK NULL, unit_id FK NULL, sub_unit_id FK NULL,
      status, created_at)
```

### Members & Categories
```
contribution_categories(id, name, amount, status, created_at)

members(id, member_code UNIQUE, name, phone NULL, gender NULL, date_of_birth NULL,
        contribution_category_id FK, sub_unit_id FK, status,
        registered_at, registered_by FK -> users.id)
```

### Contributions
```
contribution_periods(id, month, year, status, created_at, UNIQUE(month, year))

member_contributions(id, member_id FK, contribution_period_id FK,
                      expected_amount, status ENUM('PAID','UNPAID'),
                      paid_at NULL, UNIQUE(member_id, contribution_period_id))
```

### Payments
```
payments(id, member_contribution_id FK, amount, method ENUM('CASH','ONLINE'),
         status ENUM('PENDING','PROCESSING','SUCCESS','FAILED','CANCELLED',
                      'EXPIRED','REFUNDED'),
         transaction_reference UNIQUE NULL, recorded_by FK -> users.id NULL,
         refunded_by FK -> users.id NULL, refunded_at NULL, created_at)

payment_links(id, token UNIQUE, member_contribution_id FK, collector_id FK -> users.id,
              status ENUM('PENDING','USED','EXPIRED','CANCELLED'),
              attempt_count TINYINT DEFAULT 0, locked_until NULL,
              expires_at, created_at)
```

### Records
```
receipts(id, payment_id FK UNIQUE, receipt_number UNIQUE, verification_code UNIQUE,
         created_at)

audit_logs(id, user_id FK -> users.id NULL, action, entity, entity_id,
           metadata JSON, created_at)
```

### Optional (add if needed)
```
system_settings(id, key UNIQUE, value)
notifications(id, member_id FK NULL, user_id FK NULL, channel, payload, status, created_at)
```

## 6. API Surface (grouped by role)

**Public (no auth)**
- `GET /payment/:token` → link details
- `POST /payment/:token/verify-member` → member_code check (rate-limited)
- `POST /payment/:token/pay` → initiate gateway payment
- `POST /api/payments/webhook` → gateway callback (signature-verified)
- `GET /receipt/verify/:verification_code` → public receipt check

**Staff (JWT auth, RBAC-scoped)**
- `POST /auth/login`
- `GET/POST /members`, `GET /members/:code`
- `POST /payments/cash` (Collector)
- `POST /payment-links` (Collector)
- `GET /dashboard` (scoped by role: central/zone/unit/collector)
- `POST /payments/:id/refund` (Central Management only)
- `GET /reports/...`

## 7. Security

- HTTPS everywhere; JWT short-lived + refresh; bcrypt/Argon2 password hashing.
- Hierarchical authorization enforced server-side on every query (never trust frontend scope).
- Webhook signature verification before processing any gateway event.
- Rate limiting on public member-code entry (`attempt_count`/`locked_until` in `payment_links`).
- All financial state changes (payment success, refund) happen inside a DB transaction alongside the audit log write.
