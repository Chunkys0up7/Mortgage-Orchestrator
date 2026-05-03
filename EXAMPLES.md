# Pursuit Bank — AI Copilot Examples

A reference guide for loan officers and processors showing how to interact with the Pursuit AI chat panel and agent workflows.

---

## Daily Briefing

Click the **Daily Briefing** button (☀️) in the top bar, or type:

```
Good morning — give me today's briefing
```

**What you get:**
- Pipeline health by stage (Application → Funded)
- Urgent tasks sorted by due date with borrower names
- Escrow shortages with dollar exposure
- HELOC applications awaiting review
- Top 3 specific actions for the day — named borrowers, named next steps

---

## New Loan Applications

### Start a purchase loan
```
New application — Maria Gonzalez, wants a 30-year fixed on a $485,000 purchase in Austin TX
```

### Start a refinance
```
New refi — James Whitfield, current rate 7.1%, wants to lock in something better. Loan around $320,000.
```

### Ask what products fit a borrower
```
What loan products work for someone with a 680 credit score, 12% down, $550,000 purchase price?
```

---

## Existing Customer Lookups

### Pull a full borrower profile
```
Look up Sarah Nguyen
```

### Check a specific loan file
```
What's the status on PB-2025-1052401?
```

### See all open tasks for a borrower
```
What tasks are open for Carlos Rivera?
```

---

## Task Management

### Create a task manually
```
Create an urgent document request for Michael Thornton — needs updated pay stubs by May 10th
```

### Mark a task complete
```
Mark the appraisal task for James Paterson as complete
```

### See overdue tasks across the pipeline
```
Show me everything that's overdue right now
```

### Prioritize the day's work
```
What should I work on first today?
```

---

## Pipeline Management

### Advance a loan to the next stage
```
Move PB-2025-1046533 from processing to underwriting
```

### Check what's stalled
```
Which loans haven't had any activity this week?
```

### Closing risk check
```
Which closing files are missing a Closing Disclosure task?
```

---

## Escrow

### Get all shortages
```
Show me all escrow shortages
```

### Check a specific account
```
What's the escrow situation on Michael Thornton's loan?
```

### Run the Escrow Analysis agent
Click **Run Agent** on the **Escrow Analysis** card — or type:
```
Run the escrow analysis agent
```

The agent will:
1. Fetch all escrow accounts
2. Check balances against upcoming disbursements
3. Flag shortages with exact dollar amounts
4. Calculate required monthly payment adjustments
5. Create tasks for each shortage found

---

## HELOC Applications

### Check pending HELOCs
```
What HELOCs are waiting for review?
```

### Review a specific HELOC
```
Tell me about Patricia Monroe's HELOC application
```

### Run the HELOC Processing agent
Click **Run Agent** on the **HELOC Processing** card — or type:
```
Run the HELOC processing agent
```

The agent checks credit, verifies LTV, reviews product guidelines, and flags any issues.

---

## Agent Workflows

### Run all six agents in sequence (full operations audit)
```
Run escrow analysis, then task triage, then pipeline monitor
```

### Escrow Analysis
Flags all shortages, calculates adjustments, creates shortfall tasks.
```
Run the escrow analysis agent
```

### HELOC Processing
Pulls pending applications, runs credit and LTV checks, flags guideline issues.
```
Run the HELOC processing agent
```

### Loan Intake
Walks a new application through the full intake sequence — borrower lookup, employment verify, DTI, product match.
```
Run loan intake for David Kim, $410,000 purchase, 20% down, 740 credit score
```

### Task Triage
Audits the full open task queue, sorts by overdue and priority, assigns unassigned tasks.
```
Run the task triage agent
```

### Pipeline Monitor
Scans every active loan by stage, flags stalled files, surfaces closing-risk loans.
```
Run the pipeline monitor agent
```

### Document Review
Checks all processing and underwriting loans for missing documents, creates document request tasks.
```
Run the document review agent
```

---

## Guided Mode

Enable **Guide Me** (top of the chat panel) to switch the AI into decision-by-decision mode. Every stage advance and bulk task creation will pause and present a structured decision block before acting.

Useful for:
- Training new loan officers
- Audit-ready workflows where every choice must be logged
- Complex files where you want to approve each step

All decisions are logged in the **Decision Log** panel at the bottom of the screen for the current session.

---

## Quick Reference — Common Phrases

| Intent | Example prompt |
|--------|---------------|
| Daily briefing | `Good morning — what's on the board today?` |
| New purchase loan | `New app — [Name], $[amount] purchase, [down]% down` |
| New refi | `Refi for [Name], current loan around $[amount]` |
| Look up borrower | `Look up [Full Name]` |
| Check loan status | `Status on [PB-XXXX-XXXXXXXX]` |
| Create urgent task | `Urgent task for [Name] — [description], due [date]` |
| Mark task done | `Mark [task type] complete for [Name]` |
| Advance stage | `Move [loan number] to [next stage]` |
| Check escrow | `Escrow status for [Name]` |
| Run agent | `Run the [agent name] agent` |
| See overdue | `What's overdue right now?` |
| Pipeline stalls | `Which loans are stalled?` |

---

## Tips

- **Borrower names are enough** — the AI will search the database and return the matching file. You don't need loan numbers for most lookups.
- **Agents report live** — watch the workflow graph on each agent card step through in real time as the agent works.
- **Run history** — each agent card shows the last 3 runs with timestamps, task counts, and issue counts so you can see what was done and when.
- **Briefing timestamps** — the ☀️ button shows "Last: HH:MM" so you always know how fresh your data is.
