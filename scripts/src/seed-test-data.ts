// Seed test data via the running API server (no DB imports needed)
const BASE = "http://localhost:80/api";

async function post(path: string, body: Record<string, unknown>) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`POST ${path} → ${r.status}: ${txt}`);
  }
  return r.json() as Promise<Record<string, unknown>>;
}

async function get(path: string) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return r.json() as Promise<Record<string, unknown>[]>;
}

async function borrowerExists(email: string): Promise<Record<string, unknown> | null> {
  const list = await get(`/borrowers?search=${encodeURIComponent(email)}`);
  return list.find((b) => b["email"] === email) ?? null;
}

async function loanExists(loanNumber: string): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/loans?loanNumber=${loanNumber}`);
    const data = (await r.json()) as { loans?: Record<string, unknown>[] };
    return (data.loans ?? []).some((l) => l["loanNumber"] === loanNumber);
  } catch { return false; }
}

async function helocExists(loanNumber: string): Promise<boolean> {
  const list = await get("/heloc");
  return list.some((h) => h["loanNumber"] === loanNumber);
}

// ── Upsert helpers ────────────────────────────────────────────────────────────

async function upsertBorrower(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const existing = await borrowerExists(data["email"] as string);
  if (existing) {
    console.log(`  ↳ ${data["firstName"]} ${data["lastName"]} already exists (id ${existing["id"]})`);
    return existing;
  }
  const b = await post("/borrowers", data);
  console.log(`  ✓ Created ${data["firstName"]} ${data["lastName"]} (id ${b["id"]})`);
  return b;
}

async function upsertLoan(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (await loanExists(data["loanNumber"] as string)) {
    const loans = await get("/loans");
    const existing = (loans as unknown as { loans: Record<string, unknown>[] }).loans?.find(
      (l) => l["loanNumber"] === data["loanNumber"]
    );
    console.log(`  ↳ Loan ${data["loanNumber"]} already exists`);
    return existing ?? {};
  }
  const loan = await post("/loans", data);
  console.log(`  ✓ Loan ${data["loanNumber"]} — ${data["stage"]}`);
  return loan;
}

async function upsertHeloc(data: Record<string, unknown>): Promise<void> {
  if (await helocExists(data["loanNumber"] as string)) {
    console.log(`  ↳ HELOC ${data["loanNumber"]} already exists`);
    return;
  }
  await post("/heloc", data);
  console.log(`  ✓ HELOC ${data["loanNumber"]} — ${data["stage"]}`);
}

async function addTask(data: Record<string, unknown>): Promise<void> {
  await post("/tasks", data);
  const desc = (data["description"] as string).slice(0, 65);
  console.log(`  ✓ [${data["priority"]}] ${desc}`);
}

async function addEscrow(data: Record<string, unknown>): Promise<void> {
  await post("/escrow", data);
  console.log(`  ✓ Escrow for ${data["borrowerName"]} — ${data["status"]}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🌱  Seeding test data via API...\n");

  // ── 1. James Paterson — existing homeowner, HELOC candidate ──────────────
  console.log("── James Paterson  (existing homeowner, HELOC candidate)");
  const paterson = await upsertBorrower({
    firstName: "James", lastName: "Paterson",
    email: "james.paterson@email.com", phone: "(512) 884-3721",
    creditScore: 742, annualIncome: 118000,
    employmentStatus: "employed", crmSource: "manual",
    currentAddress: "1847 Westbrook Lane, Austin, TX 78701",
  });
  const patersonLoan = await upsertLoan({
    loanNumber: "PB-2022-0883741",
    borrowerId: paterson["id"], borrowerName: "James Paterson",
    propertyAddress: "1847 Westbrook Lane, Austin, TX 78701",
    loanAmount: 280000, loanType: "conventional",
    interestRate: 3.875, ltv: 62.2, dti: 28.4, creditScore: 742,
    stage: "funded", status: "active",
    loanOfficer: "Mark Santos", processor: "Lisa Reyes",
    loanPurpose: "purchase", propertyType: "single_family", occupancyType: "primary",
    closingDate: "2022-08-15",
  });
  if (patersonLoan["id"]) {
    await addEscrow({
      loanId: patersonLoan["id"], loanNumber: "PB-2022-0883741",
      borrowerName: "James Paterson",
      propertyAddress: "1847 Westbrook Lane, Austin, TX 78701",
      propertyTaxAnnual: 5200, insuranceAnnual: 1440, hoaAnnual: 0,
      monthlyEscrowPayment: 553.33, balance: 3180, status: "active",
      nextDisbursementDate: "2026-06-01", nextDisbursementType: "property_tax",
      nextDisbursementAmount: 2600,
    });
  }

  // ── 2. Lisa Chen — jumbo purchase, underwriting ───────────────────────────
  console.log("\n── Lisa Chen  (jumbo purchase, underwriting)");
  const chen = await upsertBorrower({
    firstName: "Lisa", lastName: "Chen",
    email: "lisa.chen@techcorp.com", phone: "(415) 602-8847",
    creditScore: 768, annualIncome: 145000, employmentStatus: "employed", crmSource: "manual",
    currentAddress: "890 Market St #12B, San Francisco, CA 94102",
  });
  const chenLoan = await upsertLoan({
    loanNumber: "PB-2025-1047382",
    borrowerId: chen["id"], borrowerName: "Lisa Chen",
    propertyAddress: "2234 Maple Grove Drive, Palo Alto, CA 94301",
    loanAmount: 980000, loanType: "jumbo",
    interestRate: 7.125, ltv: 74.5, dti: 32.1, creditScore: 768,
    stage: "underwriting", status: "active",
    loanOfficer: "Mark Santos", processor: "Tom Nguyen",
    loanPurpose: "purchase", propertyType: "single_family", occupancyType: "primary",
  });
  if (chenLoan["id"]) {
    await addEscrow({
      loanId: chenLoan["id"], loanNumber: "PB-2025-1047382",
      borrowerName: "Lisa Chen",
      propertyAddress: "2234 Maple Grove Drive, Palo Alto, CA 94301",
      propertyTaxAnnual: 12400, insuranceAnnual: 2200, hoaAnnual: 3600,
      monthlyEscrowPayment: 1516.67, balance: 1100, status: "shortage",
      nextDisbursementDate: "2026-05-15", nextDisbursementType: "insurance",
      nextDisbursementAmount: 2200,
    });
    await addTask({
      loanId: chenLoan["id"], loanNumber: "PB-2025-1047382",
      borrowerName: "Lisa Chen", taskType: "appraisal",
      description: "Jumbo — second appraisal required per guidelines for loans over $800k",
      dueDate: "2026-05-08", assignedTo: "Mark Santos", status: "open", priority: "urgent",
    });
    await addTask({
      loanId: chenLoan["id"], loanNumber: "PB-2025-1047382",
      borrowerName: "Lisa Chen", taskType: "document_request",
      description: "Request 2-year W-2s and recent paystubs — underwriter flagged employment gap",
      dueDate: "2026-05-10", assignedTo: "Tom Nguyen", status: "open", priority: "high",
    });
  }

  // ── 3. Marcus Williams — cash-out refi, processing ───────────────────────
  console.log("\n── Marcus Williams  (cash-out refi, processing)");
  const williams = await upsertBorrower({
    firstName: "Marcus", lastName: "Williams",
    email: "m.williams@constructco.net", phone: "(303) 741-2290",
    creditScore: 704, annualIncome: 98000, employmentStatus: "self_employed", crmSource: "manual",
    currentAddress: "4412 Ridgeline Blvd, Denver, CO 80203",
  });
  const williamsLoan = await upsertLoan({
    loanNumber: "PB-2025-1045991",
    borrowerId: williams["id"], borrowerName: "Marcus Williams",
    propertyAddress: "4412 Ridgeline Blvd, Denver, CO 80203",
    loanAmount: 340000, loanType: "conventional",
    interestRate: 7.5, ltv: 78.1, dti: 38.7, creditScore: 704,
    stage: "processing", status: "active",
    loanOfficer: "Mark Santos", processor: "Lisa Reyes",
    loanPurpose: "cash_out_refinance", propertyType: "single_family", occupancyType: "primary",
  });
  if (williamsLoan["id"]) {
    await addEscrow({
      loanId: williamsLoan["id"], loanNumber: "PB-2025-1045991",
      borrowerName: "Marcus Williams",
      propertyAddress: "4412 Ridgeline Blvd, Denver, CO 80203",
      propertyTaxAnnual: 4800, insuranceAnnual: 1320, hoaAnnual: 0,
      monthlyEscrowPayment: 510, balance: 920, status: "shortage",
      nextDisbursementDate: "2026-05-20", nextDisbursementType: "property_tax",
      nextDisbursementAmount: 2400,
    });
    await addTask({
      loanId: williamsLoan["id"], loanNumber: "PB-2025-1045991",
      borrowerName: "Marcus Williams", taskType: "document_request",
      description: "Self-employed: need 2-year business tax returns and YTD P&L statement",
      dueDate: "2026-05-09", assignedTo: "Lisa Reyes", status: "open", priority: "urgent",
    });
    await addTask({
      loanId: williamsLoan["id"], loanNumber: "PB-2025-1045991",
      borrowerName: "Marcus Williams", taskType: "condition",
      description: "DTI at 38.7% — confirm 6-month cash reserves for cash-out refi",
      dueDate: "2026-05-12", assignedTo: "Mark Santos", status: "open", priority: "high",
    });
  }

  // ── 4. Jennifer Santos — FHA purchase, application ───────────────────────
  console.log("\n── Jennifer Santos  (FHA purchase, application)");
  const santos = await upsertBorrower({
    firstName: "Jennifer", lastName: "Santos",
    email: "j.santos@gmail.com", phone: "(713) 558-9031",
    creditScore: 638, annualIncome: 72000, employmentStatus: "employed", crmSource: "manual",
    currentAddress: "7821 Cypress Creek Pkwy #204, Houston, TX 77070",
  });
  const santosLoan = await upsertLoan({
    loanNumber: "PB-2025-1049103",
    borrowerId: santos["id"], borrowerName: "Jennifer Santos",
    propertyAddress: "3309 Pecan Hollow Drive, Houston, TX 77084",
    loanAmount: 198500, loanType: "fha",
    interestRate: 7.25, ltv: 96.5, dti: 41.2, creditScore: 638,
    stage: "application", status: "active",
    loanOfficer: "Mark Santos", processor: "Tom Nguyen",
    loanPurpose: "purchase", propertyType: "single_family", occupancyType: "primary",
  });
  if (santosLoan["id"]) {
    await addTask({
      loanId: santosLoan["id"], loanNumber: "PB-2025-1049103",
      borrowerName: "Jennifer Santos", taskType: "disclosure",
      description: "Send FHA disclosure package — Loan Estimate due within 3 business days of application",
      dueDate: "2026-05-05", assignedTo: "Tom Nguyen", status: "open", priority: "urgent",
    });
    await addTask({
      loanId: santosLoan["id"], loanNumber: "PB-2025-1049103",
      borrowerName: "Jennifer Santos", taskType: "condition",
      description: "FHA 3.5% down: confirm $6,947 down payment funds are sourced and seasoned",
      dueDate: "2026-05-12", assignedTo: "Mark Santos", status: "open", priority: "high",
    });
  }

  // ── 5. David Park — existing mortgage + active HELOC application ──────────
  console.log("\n── David Park  (existing mortgage, HELOC in underwriting)");
  const park = await upsertBorrower({
    firstName: "David", lastName: "Park",
    email: "david.park@parkventures.com", phone: "(206) 394-7712",
    creditScore: 761, annualIncome: 210000, employmentStatus: "self_employed", crmSource: "manual",
    currentAddress: "5521 Lake Washington Blvd NE, Bellevue, WA 98004",
  });
  const parkLoan = await upsertLoan({
    loanNumber: "PB-2020-0641872",
    borrowerId: park["id"], borrowerName: "David Park",
    propertyAddress: "5521 Lake Washington Blvd NE, Bellevue, WA 98004",
    loanAmount: 620000, loanType: "conventional",
    interestRate: 3.125, ltv: 51.7, dti: 24.3, creditScore: 761,
    stage: "funded", status: "active",
    loanOfficer: "Mark Santos", processor: "Lisa Reyes",
    loanPurpose: "purchase", propertyType: "single_family", occupancyType: "primary",
    closingDate: "2020-11-20",
  });
  if (parkLoan["id"]) {
    await addEscrow({
      loanId: parkLoan["id"], loanNumber: "PB-2020-0641872",
      borrowerName: "David Park",
      propertyAddress: "5521 Lake Washington Blvd NE, Bellevue, WA 98004",
      propertyTaxAnnual: 9800, insuranceAnnual: 2400, hoaAnnual: 6000,
      monthlyEscrowPayment: 1516.67, balance: 8200, status: "active",
      nextDisbursementDate: "2026-07-01", nextDisbursementType: "property_tax",
      nextDisbursementAmount: 4900,
    });
  }
  await upsertHeloc({
    loanNumber: "PB-HELOC-2025-0051",
    borrowerId: park["id"], borrowerName: "David Park",
    propertyAddress: "5521 Lake Washington Blvd NE, Bellevue, WA 98004",
    creditLimit: 300000, availableCredit: 300000, drawnAmount: 0,
    interestRate: 8.75, drawPeriodEnd: "2035-05-01", repaymentPeriodEnd: "2055-05-01",
    stage: "underwriting", status: "pending",
    ltv: 67.8, creditScore: 761, loanOfficer: "Mark Santos",
  });
  if (parkLoan["id"]) {
    await addTask({
      loanId: parkLoan["id"], loanNumber: "PB-HELOC-2025-0051",
      borrowerName: "David Park", taskType: "appraisal",
      description: "Order appraisal for HELOC — estimated value $1.2M, formal appraisal needed to confirm LTV",
      dueDate: "2026-05-10", assignedTo: "Mark Santos", status: "open", priority: "high",
    });
  }

  console.log("\n✅  Seed complete.\n");
}

main().catch((e) => { console.error("Seed failed:", e); process.exit(1); });
