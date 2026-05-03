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

### All Test Clients (13 borrowers, 18 total)
| ID | Name | Scenario | Stage | Loan Type |
|---|---|---|---|---|
| 1 | Michael Thornton | Original | funded | conventional |
| 2 | Sarah Nguyen | Original | processing | conventional |
| 3 | James Wallace | Original | underwriting | jumbo |
| 4 | Elena Castillo | Original | approved | fha |
| 5 | David Kim | Original | application | va |
| 6 | Patricia Monroe | Original | closing | conventional |
| 7 | Robert Chen | Original | processing | heloc |
| 8 | Amanda Foster | Original | funded | conventional |
| 9 | James Paterson | Existing homeowner, prime HELOC candidate (credit 742, 62% LTV) | funded | conventional |
| 10 | Lisa Chen | Jumbo $980k purchase, employment gap flag | underwriting | jumbo |
| 11 | Marcus Williams | Cash-out refi, self-employed, DTI 38.7% | processing | conventional |
| 12 | Jennifer Santos | FHA first-time buyer, 3.5% down | application | fha |
| 13 | David Park | Existing homeowner + HELOC $300k in underwriting | funded + heloc | conventional |
| 14 | Rachel Kim | VA purchase $320k, needs COE | processing | va |
| 15 | Thomas Okoye | USDA rural $185k, income eligibility check | application | usda |
| 16 | Sandra Buchanan | Rate-term refi $415k, condo warrantability | underwriting | conventional |
| 17 | Carlos Rivera | Approaching closing 2026-05-09, 2 urgent CTC tasks | closing | conventional |
| 18 | Megan Hartley | Investment property $295k, lease docs + reserves | underwriting | conventional |

### Re-seeding
Run `pnpm --filter @workspace/scripts run seed` — script is idempotent (skips existing records by email/loanNumber).

## Agent Hub — CopilotKit Actions
15 registered actions across 3 categories:

### Customer Intelligence
- `search_customer(name)` — searches borrowers by name
- `get_customer_full_profile(borrowerId, borrowerName)` — full history: loans, HELOC, escrow
- `check_heloc_eligibility(borrowerId, borrowerName, estimatedPropertyValue, requestedCreditLimit)` — credit + LTV eligibility
- `create_heloc_application(...)` — creates HELOC after confirming eligibility
- `calculate_dti(annualIncome, monthlyDebts, proposedMonthlyPayment)` — DTI + guideline check

### Loan & Task Operations
- `get_loan_details(loanNumber)` — loan record + open tasks
- `get_loans_in_stage(stage)` — filter pipeline by stage
- `get_loan_documents(loanNumber)` — document checklist completeness
- `create_loan_task(...)` — create processor task
- `search_tasks_by_borrower(borrowerName)` — all tasks for a borrower

### Pipeline & Escrow Analysis
- `get_all_escrow_accounts()` — all accounts with shortfall/surplus computed
- `get_escrow_shortages()` — shortage-only detail
- `get_pipeline_at_risk()` — stalled and closing-risk loans
- `get_heloc_pending_details()` — pending HELOC applications
- `get_overdue_tasks()` — overdue and urgent tasks

## Agent Workflows (6 agents)
Each workflow has an explicit trigger prompt naming exact tool calls:
1. **Escrow Analysis** — `get_all_escrow_accounts` → `get_escrow_shortages` → `create_loan_task` per shortage
2. **HELOC Processing** — `get_heloc_pending_details` → credit/LTV checks → `create_loan_task` per issue
3. **Loan Intake** — `search_customer` → `calculate_dti` → product match → `create_loan_task`
4. **Task Triage** — `get_overdue_tasks` → tier grouping → escalation via `create_loan_task`
5. **Pipeline Monitor** — `get_pipeline_at_risk` → `get_loans_in_stage` per stage → `create_loan_task` for gaps
6. **Document Review** — `get_loans_in_stage` → `get_loan_documents` per loan → `create_loan_task` per gap

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
