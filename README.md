# Centralized Dues Management System

A membership, contribution, payment, and welfare management system for a Nigerian volunteer organization (~5,000 members).

## Project Structure

```
.
├── backend/          # Node.js + Express REST API
├── frontend/         # React.js web application
├── AGENT.md          # Non-negotiable rules and conventions
├── ARCHITECTURE.md   # Database schema and API surface
├── BUILD_PLAN.md     # Phased build plan
└── PROMPT.md         # Current task instructions
```

## Tech Stack

- **Backend**: Node.js + Express.js, MySQL (Knex migrations), JWT + bcrypt/Argon2
- **Frontend**: React.js (Vite)
- **Payments**: Paystack or Flutterwave
- **Hosting**: Hostinger Business (Web App Hosting)

## Documentation

- [Architecture & Design](ARCHITECTURE.md)
- [Build Plan](BUILD_PLAN.md)
- [Agent Rules](AGENT.md)

## Getting Started

See individual `README.md` files in `/backend` and `/frontend` for setup instructions.