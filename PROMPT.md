You are building a centralized membership, contribution, payment, and welfare
management system for a Nigerian volunteer organization.

Before writing any code:
1. Read `AGENT.md` fully — it contains non-negotiable rules about payment
   verification, idempotency, duplicate prevention, refunds, and authorization.
   Treat these as hard constraints, not suggestions.
2. Read `ARCHITECTURE.md` — this is the finalized schema and API surface.
   Do not invent alternate table structures or endpoint shapes.
3. Read `BUILD_PLAN.md` — work through it one phase at a time, in order.
   Do not jump ahead to a later phase's features while working on an earlier one.

Start with **Phase 0 (Project Setup)** from `BUILD_PLAN.md`:
- Initialize the backend (Node.js + Express) and frontend (React) as separate
  folders in this repo.
- Set up MySQL connection and a migration tool (Knex or Sequelize — pick one
  and use it consistently).
- Add `.env.example` listing every required environment variable (DB creds,
  JWT secret, payment gateway keys, webhook secret) without real values.
- Add a `GET /health` endpoint that confirms the API is up and DB-connected.

When Phase 0 is done, stop and summarize:
- What you built
- How you verified it works
- Anything in `AGENT.md`/`ARCHITECTURE.md` that was ambiguous and how you
  resolved it (or what you need clarified before continuing)

Then wait for confirmation before starting Phase 1.
