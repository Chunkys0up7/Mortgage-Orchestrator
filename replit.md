# Pursuit Bank — Mortgage Loan System

## Overview
A multi-agent single-pane-of-glass mortgage loan origination command center for Pursuit Bank. Built for loan officers and processors to manage the full loan pipeline from pre-qualification through closing. Features a CopilotKit + AG-UI powered AI copilot ("Pursuit AI") backed by OpenAI GPT-4o via Replit AI Integrations.

## Architecture

### Monorepo Structure (pnpm workspaces)
```
artifacts/
  api-server/         Express 5 API server (port 8080, proxied to /api)
  pursuit-bank/       React + Vite frontend (port 24405, proxied to /)
  mockup-sandbox/     Vite component preview server (internal)
lib/
  api-spec/           OpenAPI 3.0 specification (source of truth)
  api-client-react/   Orval-generated React Query hooks
  api-zod/            Orval-generated Zod validation schemas
  db/                 Drizzle ORM schema + PostgreSQL
```

### Key Technology
- **Frontend**: React 18 + Vite, Tailwind CSS v4, shadcn/ui, wouter routing, TanStack Query
- **Backend**: Express 5, TypeScript, Drizzle ORM, PostgreSQL
- **AI Copilot**: CopilotKit v1.50 (`@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`) + OpenAI GPT-4o via Replit AI Integrations
- **Charts**: Recharts (rate trend chart)
- **API Contract**: OpenAPI 3.0 → Orval codegen → React Query hooks + Zod schemas

## Features

### Pages
- `/` — Dashboard: $4.2M pipeline volume, 8 loans, stage distribution, activity feed
- `/loans` — Loan Pipeline: all 8 loans with color-coded stage badges, loan officer info
- `/loans/:id` — Loan Detail: 360-view with stage stepper, borrower details, documents checklist, notes, underwriting tab. CopilotKit `useCopilotReadable` + `useCopilotAction` for AI context injection
- `/borrowers` — Borrower CRM: 8 mock borrowers from Salesforce/HubSpot/manual sources
- `/borrowers/:id` — Borrower Detail: full financial profile
- `/rates` — Rate Sheet: 30-day recharts trend + current rate table for all products
- `/products` — Product Catalog: 8 loan products with eligibility matrix
- `/knowledge` — Knowledge Base: 12 articles (loan types, Freddie/Fannie guides, process docs, underwriting)

### AI Copilot (Pursuit AI)
- CopilotPopup floating button (bottom-right)
- Runtime URL: `/api/copilot`
- Model: GPT-4o via Replit AI Integrations
- System prompt includes full Pursuit Bank guidelines, Freddie Mac/Fannie Mae standards, product matrix, rate info, document requirements
- On loan detail pages: loan context injected via `useCopilotReadable`
- AI can add notes and advance loan stages via `useCopilotAction`

## Database Schema (PostgreSQL via Drizzle)
Tables: `borrowers`, `loan_products`, `loans`, `loan_notes`, `loan_documents`, `mortgage_rates`, `knowledge_articles`, `activity_log`

### Seed Data
- 13 borrowers total (8 original + 5 added via `pnpm --filter @workspace/scripts run seed`)
- 8 loan products (conventional 30/15yr, FHA, VA, Jumbo, 5/1 ARM, 7/1 ARM, USDA)
- 10 mortgage rate entries (all product types)
- 13 active loans across all pipeline stages
- 10 loan documents for loan #1 (Michael Thornton)
- 10 activity log entries
- 12 knowledge base articles

### New Test Clients (added via seed script)
- **James Paterson** (id 9) — existing homeowner, funded 2022 conventional @ 3.875%, active escrow, prime HELOC candidate (credit 742, 62% LTV)
- **Lisa Chen** (id 10) — jumbo purchase $980k, underwriting, 2 urgent tasks (second appraisal, W-2 gap)
- **Marcus Williams** (id 11) — cash-out refi $340k, processing, self-employed (2 urgent tasks: business tax returns, DTI reserves)
- **Jennifer Santos** (id 12) — FHA purchase $198.5k, application stage, 2 urgent tasks (disclosure, down payment sourcing)
- **David Park** (id 13) — existing funded mortgage, HELOC $300k in underwriting

### Re-seeding
Run `pnpm --filter @workspace/scripts run seed` — script is idempotent (skips existing records by email/loanNumber).

## API Routes
All routes prefixed with `/api`:
- `GET /api/healthz`
- `GET/POST /api/loans`, `GET/PATCH /api/loans/:id`, `PATCH /api/loans/:id/status`
- `GET/POST /api/loans/:id/notes`
- `GET/POST /api/loans/:id/documents`, `PATCH /api/loans/:loanId/documents/:docId`
- `GET/POST /api/borrowers`, `GET /api/borrowers/:id`
- `GET /api/rates`, `GET /api/rates/history`
- `GET /api/products`, `GET /api/products/:id`
- `GET /api/knowledge/articles`, `GET /api/knowledge/articles/:id`
- `GET /api/pipeline/summary`, `GET /api/pipeline/activity`
- `POST/GET /api/copilot`, `GET /api/copilot/info` (CopilotKit runtime)

## Important Notes

### CopilotKit Express Routing Fix
CopilotKit's Hono-based router uses `basePath: "/api/copilot"` for internal routing. When mounted through Express's path-prefix routing, `req.url` gets stripped of the path prefix. The fix in `artifacts/api-server/src/routes/copilot.ts` restores `req.url = req.originalUrl` before passing to the CopilotKit handler so Hono can match correctly.

### Code Generation
Run `pnpm --filter @workspace/api-spec run codegen` after modifying `lib/api-spec/openapi.yaml` to regenerate hooks and schemas.

### DB Migrations
Run `pnpm --filter @workspace/db run push` to push schema changes.

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `AI_INTEGRATIONS_OPENAI_BASE_URL` — Replit AI proxy base URL
- `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI proxy API key
- `SESSION_SECRET` — Express session secret
- `PORT` — Server port (set by workflows)
