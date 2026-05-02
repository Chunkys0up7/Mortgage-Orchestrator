import { useState, useEffect, useCallback } from "react";
import { useCopilotChat, useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import {
  useListEscrow, useListHeloc, useListTasks,
  useGetPipelineSummary, useListLoans, useCreateTask,
  useCreateHeloc,
} from "@workspace/api-client-react";
import {
  Building2, CreditCard, FilePlus2, ClipboardList, Activity, Files,
  Database, Calculator, AlertTriangle, FileText, Shield, Percent,
  BookOpen, ClipboardCheck, RefreshCw, User, Briefcase, Layers,
  Clock, ArrowUpDown, UserCheck, Bell, Search, CalendarClock,
  Calendar, FileBarChart, FolderOpen, Send, CheckCircle2, Zap,
  Download, ChevronRight, RotateCcw, Info, TrendingUp, AlertCircle
} from "lucide-react";
import { formatCurrency } from "@/lib/format";

// ─── Agent Definitions ───────────────────────────────────────────────────────

type StepStatus = "idle" | "active" | "complete" | "error";

interface AgentStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AgentDef {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;        // tailwind bg class for icon bg
  accentText: string;         // tailwind text class for icon
  borderActive: string;       // border class when running
  steps: AgentStep[];
  trigger: string;
}

const AGENTS: AgentDef[] = [
  {
    id: "escrow-analysis",
    name: "Escrow Analysis",
    description: "Reviews all escrow accounts, flags shortages and surpluses, recalculates monthly payments, generates analysis letters and creates follow-up tasks.",
    icon: Building2,
    accentColor: "bg-blue-500/15",
    accentText: "text-blue-400",
    borderActive: "border-blue-500/60",
    steps: [
      { id: "fetch", label: "Fetch Accounts", icon: Database },
      { id: "calc", label: "Calc Payments", icon: Calculator },
      { id: "flag", label: "Flag Shortages", icon: AlertTriangle },
      { id: "letters", label: "Draft Letters", icon: FileText },
      { id: "tasks", label: "Create Tasks", icon: ClipboardList },
      { id: "done", label: "Complete", icon: CheckCircle2 },
    ],
    trigger: "Run the escrow analysis agent. Review all escrow accounts, identify any shortages or surpluses by comparing current balances to required reserves, calculate required monthly payment adjustments for each account, and create follow-up tasks for any accounts in shortage. Summarise all findings with specific account names and dollar amounts.",
  },
  {
    id: "heloc-processing",
    name: "HELOC Processing",
    description: "Reviews pending HELOC applications, checks credit scores and LTV ratios against guidelines, generates approval conditions and updates status.",
    icon: CreditCard,
    accentColor: "bg-violet-500/15",
    accentText: "text-violet-400",
    borderActive: "border-violet-500/60",
    steps: [
      { id: "pull", label: "Pull Applications", icon: Download },
      { id: "credit", label: "Check Credit", icon: Shield },
      { id: "ltv", label: "Calculate LTV", icon: Percent },
      { id: "guidelines", label: "Verify Guidelines", icon: BookOpen },
      { id: "conditions", label: "Gen Conditions", icon: ClipboardCheck },
      { id: "update", label: "Update Status", icon: RefreshCw },
    ],
    trigger: "Run the HELOC processing agent. Review all pending HELOC applications, check each applicant's credit score and calculate LTV ratios against our guidelines (max 85% LTV for HELOCs), identify any eligibility issues, and generate a specific list of approval conditions for each application. Provide a status recommendation for each pending application.",
  },
  {
    id: "loan-intake",
    name: "Loan Intake",
    description: "Guides new loan applications through intake: borrower verification, DTI calculation, product matching, and document checklist generation.",
    icon: FilePlus2,
    accentColor: "bg-emerald-500/15",
    accentText: "text-emerald-400",
    borderActive: "border-emerald-500/60",
    steps: [
      { id: "gather", label: "Gather Info", icon: User },
      { id: "verify", label: "Verify Employment", icon: Briefcase },
      { id: "dti", label: "Calculate DTI", icon: Calculator },
      { id: "match", label: "Match Product", icon: Layers },
      { id: "checklist", label: "Build Checklist", icon: ClipboardList },
    ],
    trigger: "Run the loan intake agent. Help me start a new loan application. Ask me for the key borrower information needed, calculate DTI, identify the best matching loan product from our portfolio, and generate a complete document checklist for the borrower. Walk me through each step interactively.",
  },
  {
    id: "task-triage",
    name: "Task Triage",
    description: "Sorts the full task queue by urgency and due date, escalates overdue items, reassigns unattended tasks, and generates a prioritised daily action plan.",
    icon: ClipboardList,
    accentColor: "bg-amber-500/15",
    accentText: "text-amber-400",
    borderActive: "border-amber-500/60",
    steps: [
      { id: "load", label: "Load Queue", icon: Database },
      { id: "overdue", label: "Check Overdue", icon: Clock },
      { id: "prioritise", label: "Prioritise", icon: ArrowUpDown },
      { id: "reassign", label: "Flag Reassign", icon: UserCheck },
      { id: "plan", label: "Action Plan", icon: Bell },
    ],
    trigger: "Run the task triage agent. Review the entire open task queue, identify every overdue or urgent item, assess which tasks need immediate attention vs can wait, flag any tasks that need reassignment, and produce a prioritised action plan for today with specific tasks listed by priority order. Include borrower names and loan numbers.",
  },
  {
    id: "pipeline-monitor",
    name: "Pipeline Monitor",
    description: "Scans all active loans for stage duration, identifies stalled files, flags closings at risk, and reports on pipeline health.",
    icon: Activity,
    accentColor: "bg-rose-500/15",
    accentText: "text-rose-400",
    borderActive: "border-rose-500/60",
    steps: [
      { id: "scan", label: "Scan Pipeline", icon: Search },
      { id: "age", label: "Check Stage Age", icon: CalendarClock },
      { id: "flag", label: "Flag At-Risk", icon: AlertTriangle },
      { id: "closings", label: "Review Closings", icon: Calendar },
      { id: "report", label: "Pipeline Report", icon: FileBarChart },
    ],
    trigger: "Run the pipeline monitor agent. Scan all active loans in the pipeline, check how long each loan has been in its current stage, identify any files that appear stalled or at risk of missing deadlines, flag any loans approaching closing that need immediate processor attention, and generate a comprehensive pipeline health report with specific loan numbers and recommended actions.",
  },
  {
    id: "document-review",
    name: "Document Review",
    description: "Checks loan file completeness against document checklists, identifies missing items, generates outstanding condition requests.",
    icon: Files,
    accentColor: "bg-cyan-500/15",
    accentText: "text-cyan-400",
    borderActive: "border-cyan-500/60",
    steps: [
      { id: "load", label: "Load Files", icon: FolderOpen },
      { id: "check", label: "Check Checklist", icon: ClipboardCheck },
      { id: "gaps", label: "Find Gaps", icon: Search },
      { id: "request", label: "Draft Requests", icon: Send },
      { id: "log", label: "Log Conditions", icon: FileText },
    ],
    trigger: "Run the document review agent. Check the document completeness across loans currently in processing and underwriting stages. Identify which loans have missing documents or outstanding conditions, draft specific document request messages for each gap found, and provide a complete list of conditions that need to be logged in the system.",
  },
];

// ─── Agent Run State ──────────────────────────────────────────────────────────

interface AgentRunState {
  status: "idle" | "running" | "complete" | "error";
  activeStep: number;
  completedSteps: Set<number>;
  lastRunAt: Date | null;
  summary: string | null;
}

const defaultState = (): AgentRunState => ({
  status: "idle",
  activeStep: -1,
  completedSteps: new Set(),
  lastRunAt: null,
  summary: null,
});

// ─── Workflow Graph Component ─────────────────────────────────────────────────

function WorkflowGraph({
  steps,
  runState,
}: {
  steps: AgentStep[];
  runState: AgentRunState;
}) {
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-1">
      {steps.map((step, i) => {
        const isComplete = runState.completedSteps.has(i);
        const isActive = runState.activeStep === i;
        const isError = runState.status === "error" && isActive;

        let nodeClass = "bg-[hsl(217_33%_13%)] border-[hsl(217_33%_20%)] text-[hsl(215_20%_45%)]";
        let labelClass = "text-[hsl(215_20%_38%)]";
        let iconClass = "text-[hsl(215_20%_40%)]";

        if (isError) {
          nodeClass = "bg-red-950/60 border-red-500/60 text-red-300";
          labelClass = "text-red-400";
          iconClass = "text-red-400";
        } else if (isComplete) {
          nodeClass = "bg-emerald-950/60 border-emerald-500/50 text-emerald-300";
          labelClass = "text-emerald-400/80";
          iconClass = "text-emerald-400";
        } else if (isActive) {
          nodeClass = "bg-blue-950/70 border-blue-400/70 text-blue-200 step-active";
          labelClass = "text-blue-300/90";
          iconClass = "text-blue-300";
        }

        const isLastStep = i === steps.length - 1;
        const isArrowActive = runState.activeStep === i || runState.completedSteps.has(i);

        return (
          <div key={step.id} className="flex items-center shrink-0">
            {/* Node */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-500 ${nodeClass}`}>
                {isComplete ? (
                  <CheckCircle2 className={`w-3.5 h-3.5 ${iconClass}`} />
                ) : (
                  <step.icon className={`w-3.5 h-3.5 ${iconClass}`} />
                )}
              </div>
              <span className={`text-[9px] font-medium text-center leading-tight w-11 transition-colors duration-500 ${labelClass}`}>
                {step.label}
              </span>
            </div>

            {/* Arrow connector */}
            {!isLastStep && (
              <div className={`flex items-center mx-1 mb-4 transition-colors duration-300 ${isArrowActive ? "arrow-active" : ""}`}>
                <div className={`h-px w-4 ${isArrowActive ? "bg-blue-500/60" : "bg-[hsl(217_33%_18%)]"}`} />
                <ChevronRight className={`w-3 h-3 -ml-1 ${isArrowActive ? "text-blue-500/60" : "text-[hsl(217_33%_22%)]"}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Status Dot ──────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentRunState["status"] }) {
  if (status === "idle") return <div className="w-2 h-2 rounded-full bg-[hsl(217_33%_28%)]" />;
  if (status === "running") return (
    <div className="relative w-2 h-2">
      <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
      <div className="relative w-2 h-2 rounded-full bg-blue-400" />
    </div>
  );
  if (status === "complete") return <div className="w-2 h-2 rounded-full bg-emerald-400" />;
  return <div className="w-2 h-2 rounded-full bg-red-400" />;
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  runState,
  onRun,
  isAnyRunning,
}: {
  agent: AgentDef;
  runState: AgentRunState;
  onRun: (agentId: string) => void;
  isAnyRunning: boolean;
}) {
  const isRunning = runState.status === "running";
  const isComplete = runState.status === "complete";
  const canRun = !isAnyRunning;

  return (
    <div className={`
      rounded-xl border transition-all duration-300 flex flex-col
      ${isRunning
        ? `border-blue-500/40 bg-[hsl(222_47%_11%)] shadow-lg shadow-blue-500/10`
        : `border-[hsl(217_33%_17%)] bg-[hsl(222_47%_9%)] hover:border-[hsl(217_33%_24%)]`
      }
    `}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${agent.accentColor}`}>
            <agent.icon className={`w-5 h-5 ${agent.accentText}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[hsl(210_40%_88%)]">{agent.name}</h3>
              <StatusDot status={runState.status} />
            </div>
            <p className="text-xs text-[hsl(215_20%_45%)] mt-0.5 leading-snug line-clamp-2">
              {agent.description}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Graph */}
      <div className="px-4 py-3 border-t border-[hsl(217_33%_14%)]">
        <div className="text-[9px] font-semibold text-[hsl(215_20%_35%)] uppercase tracking-widest mb-2.5">
          Workflow
        </div>
        <WorkflowGraph steps={agent.steps} runState={runState} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(217_33%_14%)] mt-auto">
        <div className="text-xs text-[hsl(215_20%_38%)]">
          {isRunning && (
            <span className="text-blue-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Processing...
            </span>
          )}
          {isComplete && runState.lastRunAt && (
            <span className="text-emerald-400/70 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Done · {runState.lastRunAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {runState.status === "idle" && (
            <span className="text-[hsl(215_20%_35%)]">Ready to run</span>
          )}
        </div>
        <div className="flex gap-2">
          {isComplete && (
            <button
              onClick={() => onRun(agent.id)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-[hsl(217_33%_20%)] text-[hsl(215_20%_50%)] hover:text-[hsl(210_40%_80%)] hover:border-[hsl(217_33%_28%)] transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Re-run
            </button>
          )}
          {(runState.status === "idle" || isComplete) && (
            <button
              onClick={() => onRun(agent.id)}
              disabled={isAnyRunning && !isComplete}
              className={`
                text-xs px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-all
                ${canRun
                  ? `bg-[hsl(217_33%_17%)] hover:bg-[hsl(217_33%_22%)] text-[hsl(210_40%_85%)] border border-[hsl(217_33%_24%)]`
                  : `bg-[hsl(217_33%_13%)] text-[hsl(215_20%_35%)] border border-[hsl(217_33%_17%)] cursor-not-allowed`
                }
              `}
            >
              <Zap className="w-3 h-3" />
              Run Agent
            </button>
          )}
          {isRunning && (
            <div className="text-xs px-3 py-1.5 rounded-md border border-blue-500/30 text-blue-400 flex items-center gap-1.5 bg-blue-950/30">
              <div className="w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" />
              Running
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[hsl(222_47%_9%)] border border-[hsl(217_33%_17%)]">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[hsl(215_20%_38%)] font-semibold">{label}</div>
        <div className={`text-lg font-bold tabular-nums leading-tight ${alert ? "text-amber-400" : "text-[hsl(210_40%_90%)]"}`}>
          {value}
        </div>
        {sub && <div className="text-[10px] text-[hsl(215_20%_38%)]">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Main Agent Hub ───────────────────────────────────────────────────────────

export default function AgentHub() {
  const [agentStates, setAgentStates] = useState<Record<string, AgentRunState>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, defaultState()]))
  );
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const { appendMessage, isLoading } = useCopilotChat();

  // ── Live data for CopilotReadable ────────────────────────────────────────
  const { data: escrowAccounts } = useListEscrow();
  const { data: helocAccounts } = useListHeloc();
  const { data: openTasks } = useListTasks({ status: "open" });
  const { data: allTasks } = useListTasks({});
  const { data: summary } = useGetPipelineSummary();
  const { data: loansData } = useListLoans({});
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: createHeloc } = useCreateHeloc();

  // ── CopilotKit readable state ──────────────────────────────────────────
  useCopilotReadable({
    description: "Current escrow accounts with balances, shortages, and upcoming disbursements",
    value: escrowAccounts ?? [],
  });

  useCopilotReadable({
    description: "Current HELOC accounts including credit limits, drawn amounts, stages, and interest rates",
    value: helocAccounts ?? [],
  });

  useCopilotReadable({
    description: "Open loan tasks with priority, due dates, borrower names, and loan numbers",
    value: openTasks ?? [],
  });

  useCopilotReadable({
    description: "All loan tasks across all statuses",
    value: allTasks ?? [],
  });

  useCopilotReadable({
    description: "Loan pipeline summary: total loans, volume, open tasks, loans by stage",
    value: summary ?? {},
  });

  useCopilotReadable({
    description: "All active loans in the pipeline with stage, borrower, loan amount, and processor",
    value: loansData?.loans ?? [],
  });

  // ── CopilotKit agent actions ───────────────────────────────────────────
  useCopilotAction({
    name: "create_loan_task",
    description: "Create a new task for a specific loan in the task queue",
    parameters: [
      { name: "loanNumber", type: "string", description: "Loan number like PB-2025-XXXXXXXX" },
      { name: "borrowerName", type: "string", description: "Full name of the borrower" },
      { name: "taskType", type: "string", description: "Task type: condition, document_request, disclosure, insurance, appraisal, title, other" },
      { name: "description", type: "string", description: "Detailed task description" },
      { name: "priority", type: "string", description: "Priority: urgent, high, normal, low" },
      { name: "dueDate", type: "string", description: "Due date in ISO format YYYY-MM-DD" },
    ],
    handler: async ({ loanNumber, borrowerName, taskType, description, priority, dueDate }) => {
      const task = await createTask({
        data: { loanNumber, borrowerName, taskType, description, priority, dueDate, assignedTo: "Mark Santos" }
      });
      return `Task created: ${description} for ${borrowerName} (${loanNumber}), priority: ${priority}`;
    },
  });

  useCopilotAction({
    name: "get_escrow_shortages",
    description: "Get a detailed list of escrow accounts currently in shortage status",
    parameters: [],
    handler: async () => {
      const shortages = (escrowAccounts ?? []).filter(a => a.status === "shortage");
      if (shortages.length === 0) return "No escrow accounts currently in shortage.";
      return shortages.map(a =>
        `${a.borrowerName} (${a.loanNumber}): Balance $${a.balance?.toLocaleString()}, Monthly payment $${a.monthlyEscrowPayment?.toLocaleString()}, Next disbursement ${a.nextDisbursementDate} - ${a.nextDisbursementType} $${a.nextDisbursementAmount?.toLocaleString()}`
      ).join("\n");
    },
  });

  useCopilotAction({
    name: "get_pipeline_at_risk",
    description: "Identify loans in the pipeline that are stalled, at risk, or approaching closing",
    parameters: [],
    handler: async () => {
      const loanList = loansData?.loans ?? [];
      const closingSoon = loanList.filter((l: any) => l.stage === "closing" || l.stage === "approved");
      const processing = loanList.filter((l: any) => l.stage === "processing" || l.stage === "underwriting");
      return JSON.stringify({
        totalLoans: loanList.length,
        closingSoon: closingSoon.map((l: any) => `${l.borrowerName} (${l.loanNumber}) - ${l.stage} - $${l.loanAmount?.toLocaleString()}`),
        inProcessing: processing.map((l: any) => `${l.borrowerName} (${l.loanNumber}) - ${l.stage}`),
      });
    },
  });

  useCopilotAction({
    name: "get_heloc_pending_details",
    description: "Get detailed information about all HELOC applications pending review",
    parameters: [],
    handler: async () => {
      const pending = (helocAccounts ?? []).filter(a => a.status === "pending" || a.stage !== "active");
      return pending.map(a =>
        `${a.borrowerName} (${a.loanNumber}): $${a.creditLimit?.toLocaleString()} limit, ${a.interestRate}% rate, Stage: ${a.stage}, LTV: ${a.ltv}%`
      ).join("\n");
    },
  });

  useCopilotAction({
    name: "get_overdue_tasks",
    description: "Get all tasks that are overdue (past due date) or urgent",
    parameters: [],
    handler: async () => {
      const today = new Date().toISOString().split("T")[0];
      const overdue = (allTasks ?? []).filter((t: any) =>
        t.status === "open" && t.dueDate && t.dueDate < today
      );
      const urgent = (openTasks ?? []).filter((t: any) => t.priority === "urgent");
      return JSON.stringify({
        overdueCount: overdue.length,
        urgentCount: urgent.length,
        overdueTasks: overdue.map((t: any) => `${t.description} - ${t.borrowerName} (${t.loanNumber}) - Due: ${t.dueDate}`),
        urgentTasks: urgent.map((t: any) => `${t.description} - ${t.borrowerName} (${t.loanNumber}) - Due: ${t.dueDate}`),
      });
    },
  });

  // ── Borrower intelligence actions ──────────────────────────────────────

  useCopilotAction({
    name: "search_customer",
    description: "ALWAYS call this first when a customer name is mentioned. Searches the borrower database by name (first, last, or partial). Returns matching customer records with their ID, credit score, income, and employment.",
    parameters: [
      { name: "name", type: "string", description: "Name or partial name to search for" },
    ],
    handler: async ({ name }) => {
      const resp = await fetch(`/api/borrowers?search=${encodeURIComponent(name)}`);
      const borrowers = await resp.json();
      if (!Array.isArray(borrowers) || borrowers.length === 0) {
        return `No borrower found matching "${name}". They are not in the system. Closest names in the system: ${["Elena Castillo", "Robert Chen", "Amanda Foster", "David Kim", "Patricia Monroe", "Sarah Nguyen", "Michael Thornton", "James Wallace"].join(", ")}. Ask the user if the name might be spelled differently, or if this is a brand new customer not yet in the system.`;
      }
      return JSON.stringify(borrowers.map((b: any) => ({
        id: b.id,
        fullName: `${b.firstName} ${b.lastName}`,
        email: b.email,
        phone: b.phone,
        creditScore: b.creditScore,
        employmentStatus: b.employmentStatus,
        annualIncome: b.annualIncome,
        address: b.address,
      })));
    },
  });

  useCopilotAction({
    name: "get_customer_full_profile",
    description: "Get a customer's complete profile: their personal details, all existing mortgage loans, any HELOC accounts, and escrow accounts. Use this after finding a customer with search_customer.",
    parameters: [
      { name: "borrowerId", type: "number", description: "The borrower ID from search_customer results" },
      { name: "borrowerName", type: "string", description: "Full name of the borrower for matching" },
    ],
    handler: async ({ borrowerId, borrowerName }) => {
      const [borrowerResp, loansResp, helocResp, escrowResp] = await Promise.all([
        fetch(`/api/borrowers/${borrowerId}`),
        fetch(`/api/loans`),
        fetch(`/api/heloc`),
        fetch(`/api/escrow`),
      ]);
      const borrower = await borrowerResp.json();
      const loansData = await loansResp.json();
      const allHeloc = await helocResp.json();
      const allEscrow = await escrowResp.json();

      const nameParts = borrowerName.toLowerCase().split(" ");
      const matchName = (name: string) => nameParts.some(p => name?.toLowerCase().includes(p));

      const customerLoans = (loansData.loans ?? []).filter((l: any) =>
        l.borrowerId === borrowerId || matchName(l.borrowerName)
      );
      const customerHeloc = allHeloc.filter((h: any) =>
        h.borrowerId === borrowerId || matchName(h.borrowerName)
      );
      const customerEscrow = allEscrow.filter((e: any) => matchName(e.borrowerName));

      return JSON.stringify({
        borrower,
        existingMortgages: customerLoans.map((l: any) => ({
          loanNumber: l.loanNumber,
          loanAmount: l.loanAmount,
          stage: l.stage,
          propertyAddress: l.propertyAddress,
          loanType: l.loanType,
          interestRate: l.interestRate,
        })),
        helocAccounts: customerHeloc.map((h: any) => ({
          loanNumber: h.loanNumber,
          creditLimit: h.creditLimit,
          drawn: h.drawnAmount,
          available: h.availableCredit,
          rate: h.interestRate,
          stage: h.stage,
          status: h.status,
        })),
        escrowAccounts: customerEscrow.map((e: any) => ({
          loanNumber: e.loanNumber,
          balance: e.balance,
          monthlyPayment: e.monthlyEscrowPayment,
          status: e.status,
          nextDisbursement: `${e.nextDisbursementDate} - ${e.nextDisbursementType} $${e.nextDisbursementAmount}`,
        })),
      });
    },
  });

  useCopilotAction({
    name: "create_heloc_application",
    description: "Create a new HELOC application for an EXISTING customer. Only use after confirming the customer exists via search_customer and you have gathered: property address, requested credit limit, and confirmed the property has sufficient equity (LTV must be under 85%).",
    parameters: [
      { name: "borrowerId", type: "number", description: "Existing borrower ID from search_customer" },
      { name: "borrowerName", type: "string", description: "Full name of the borrower" },
      { name: "propertyAddress", type: "string", description: "Property address for the HELOC" },
      { name: "creditLimit", type: "number", description: "Requested credit limit in dollars" },
      { name: "estimatedLtv", type: "number", description: "Estimated combined LTV percentage (must be under 85)" },
      { name: "loanOfficer", type: "string", description: "Assigned loan officer name" },
    ],
    handler: async ({ borrowerId, borrowerName, propertyAddress, creditLimit, estimatedLtv, loanOfficer }) => {
      if (estimatedLtv > 85) {
        return `Cannot create HELOC: combined LTV of ${estimatedLtv}% exceeds our maximum of 85%. The customer would need to reduce the credit limit or their property value would need to be higher.`;
      }
      const drawEnd = new Date();
      drawEnd.setFullYear(drawEnd.getFullYear() + 10);
      const repayEnd = new Date(drawEnd);
      repayEnd.setFullYear(repayEnd.getFullYear() + 20);

      const resp = await fetch("/api/heloc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrowerId,
          borrowerName,
          propertyAddress,
          creditLimit,
          interestRate: 8.875,
          ltv: estimatedLtv,
          drawPeriodEnd: drawEnd.toISOString().split("T")[0],
          repaymentPeriodEnd: repayEnd.toISOString().split("T")[0],
          loanOfficer: loanOfficer ?? "Mark Santos",
          stage: "application",
          status: "pending",
        }),
      });
      const heloc = await resp.json();
      return `HELOC application created successfully! Loan number: ${heloc.loanNumber}. Borrower: ${borrowerName}. Credit limit: $${creditLimit.toLocaleString()} at 8.875% (current rate). Estimated LTV: ${estimatedLtv}%. Status: Pending — next step is credit pull and property appraisal. A task has been queued for processing.`;
    },
  });

  useCopilotAction({
    name: "get_loan_details",
    description: "Get full details for a specific loan by loan number",
    parameters: [
      { name: "loanNumber", type: "string", description: "The loan number e.g. PB-2025-1038492" },
    ],
    handler: async ({ loanNumber }) => {
      const loanList = loansData?.loans ?? [];
      const loan = loanList.find((l: any) => l.loanNumber === loanNumber);
      if (!loan) return `Loan ${loanNumber} not found in pipeline.`;
      const tasks = (allTasks ?? []).filter((t: any) => t.loanNumber === loanNumber);
      return JSON.stringify({ loan, openTasks: tasks.filter((t: any) => t.status === "open") });
    },
  });

  // ── Agent step animation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!activeAgentId) return;
    const agent = AGENTS.find(a => a.id === activeAgentId);
    if (!agent) return;

    const stepCount = agent.steps.length;
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < stepCount; i++) {
      const delay = i * 2800;
      timers.push(
        setTimeout(() => {
          setAgentStates(prev => ({
            ...prev,
            [activeAgentId]: {
              ...prev[activeAgentId],
              activeStep: i,
              completedSteps: new Set(Array.from({ length: i }, (_, k) => k)),
            },
          }));
        }, delay)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [activeAgentId]);

  // ── Detect when AI finishes → mark agent complete ─────────────────────
  useEffect(() => {
    if (!isLoading && activeAgentId) {
      const agent = AGENTS.find(a => a.id === activeAgentId);
      if (!agent) return;
      const allSteps = new Set(agent.steps.map((_, i) => i));
      setAgentStates(prev => ({
        ...prev,
        [activeAgentId]: {
          ...prev[activeAgentId],
          status: "complete",
          activeStep: -1,
          completedSteps: allSteps,
          lastRunAt: new Date(),
        },
      }));
      setActiveAgentId(null);
    }
  }, [isLoading, activeAgentId]);

  // ── Trigger an agent ──────────────────────────────────────────────────
  const runAgent = useCallback((agentId: string) => {
    if (activeAgentId) return;
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    setActiveAgentId(agentId);
    setAgentStates(prev => ({
      ...prev,
      [agentId]: {
        ...defaultState(),
        status: "running",
        activeStep: 0,
      },
    }));

    appendMessage(
      new TextMessage({ role: Role.User, content: agent.trigger })
    );
  }, [activeAgentId, appendMessage]);

  // ── Quick stats ────────────────────────────────────────────────────────
  const urgentCount = (openTasks ?? []).filter((t: any) => t.priority === "urgent").length;
  const shortageCount = (escrowAccounts ?? []).filter(a => a.status === "shortage").length;
  const helocPendingCount = (helocAccounts ?? []).filter(a => a.status === "pending").length;
  const loanList = loansData?.loans ?? [];
  const totalVolume = loanList.reduce((sum: number, l: any) => sum + (l.loanAmount ?? 0), 0);

  return (
    <div className="h-screen flex flex-col bg-[hsl(222_47%_7%)] overflow-hidden">

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="h-12 shrink-0 flex items-center justify-between px-5 border-b border-[hsl(217_33%_13%)] bg-[hsl(222_47%_8%)]">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-sm font-bold text-[hsl(210_40%_88%)] tracking-tight">Pursuit Bank</span>
          <span className="text-[hsl(217_33%_30%)]">·</span>
          <span className="text-xs text-[hsl(215_20%_45%)] font-medium">Operations AI</span>
        </div>
        <div className="flex items-center gap-4">
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5" />
              {urgentCount} urgent {urgentCount === 1 ? "task" : "tasks"}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-[hsl(215_20%_42%)]">
            <div className="w-5 h-5 rounded-full bg-[hsl(217_33%_22%)] flex items-center justify-center text-[9px] font-bold text-[hsl(210_40%_75%)]">
              MS
            </div>
            Mark Santos
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Agent Workspace ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[hsl(217_33%_13%)]">

          {/* Stats bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-[hsl(217_33%_13%)] overflow-x-auto shrink-0">
            <StatPill
              label="Pipeline"
              value={summary?.totalLoans ?? "—"}
              sub={totalVolume ? formatCurrency(totalVolume) : undefined}
            />
            <StatPill
              label="Open Tasks"
              value={openTasks?.length ?? "—"}
              sub={urgentCount > 0 ? `${urgentCount} urgent` : "all clear"}
              alert={urgentCount > 0}
            />
            <StatPill
              label="Escrow Shortages"
              value={shortageCount}
              sub={shortageCount > 0 ? "need analysis" : "all clear"}
              alert={shortageCount > 0}
            />
            <StatPill
              label="HELOC Pending"
              value={helocPendingCount}
              sub="awaiting review"
            />
            <div className="ml-auto shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[hsl(222_47%_9%)] border border-[hsl(217_33%_17%)] text-xs text-[hsl(215_20%_42%)]">
                <Info className="w-3.5 h-3.5" />
                Click <strong className="text-[hsl(210_40%_75%)] mx-1">Run Agent</strong> or ask Pursuit AI →
              </div>
            </div>
          </div>

          {/* Agent cards grid */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-4 max-w-5xl mx-auto">
              {AGENTS.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  runState={agentStates[agent.id]}
                  onRun={runAgent}
                  isAnyRunning={!!activeAgentId}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Always-visible CopilotKit Chat ───────────────────── */}
        <div className="w-[400px] shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(217_33%_13%)] bg-[hsl(222_47%_8%)]">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-[hsl(210_40%_80%)]">Pursuit AI</span>
            {isLoading && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-blue-400">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-hidden copilot-chat-panel">
            <CopilotChat
              className="h-full"
              instructions={`You are Pursuit AI — an intelligent mortgage operations agent for Pursuit Bank. Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

## CRITICAL RULES — follow these exactly, every time:

### 1. SEARCH BEFORE ASKING
When ANY customer name is mentioned (even partial, even mis-spelled), your VERY FIRST action must be to call search_customer with that name. Never say "I can't find them" before searching. Never ask for info you can look up.

### 2. HELOC = EXISTING CUSTOMER ONLY
HELOCs are home equity lines of credit. They require an existing property with equity. You NEVER set up a HELOC for a brand new customer with no history. When someone says "new HELOC application" or "HELOC for a client":
- Step 1: Ask for (or extract from context) the customer's name
- Step 2: Call search_customer immediately
- Step 3: If found, call get_customer_full_profile to see their existing mortgage, property, equity position
- Step 4: Confirm the property address and ask for the requested credit limit
- Step 5: Calculate or confirm estimated combined LTV (existing mortgage + HELOC / property value). Must be under 85%
- Step 6: Call create_heloc_application with confirmed details
Do NOT dump a long list of questions. Guide through it one step at a time.

### 3. PULL THE PROFILE FIRST
When you find a customer via search_customer, immediately call get_customer_full_profile. Show the user what you found — existing loans, HELOC accounts, credit score, escrow — before asking any further questions.

### 4. PRODUCT RULES (apply automatically)
- HELOC: existing customers only, max 85% combined LTV, variable rate
- Refinance: existing mortgage holders, check current rate vs new rate benefit
- New purchase: new or existing customers, need property address, purchase price, down payment
- Cash-out refi: existing customers, max 80% LTV

### 5. BE CONCISE AND CONVERSATIONAL
One step at a time. Don't dump 10 questions at once. Use bullet points only for summaries. After each action, state what you found and what the next step is.

## AVAILABLE TOOLS
- search_customer(name) — ALWAYS first when a name is mentioned
- get_customer_full_profile(borrowerId, borrowerName) — full history after search
- create_heloc_application(borrowerId, borrowerName, propertyAddress, creditLimit, estimatedLtv, loanOfficer) — create after confirming details
- get_loan_details(loanNumber) — full loan + open tasks
- create_loan_task(loanNumber, borrowerName, taskType, description, priority, dueDate) — create task
- get_escrow_shortages() — escrow shortage accounts
- get_pipeline_at_risk() — stalled/at-risk loans
- get_heloc_pending_details() — pending HELOC applications
- get_overdue_tasks() — overdue and urgent tasks

## TONE
Direct, professional, action-oriented. You are the operations control layer — not a FAQ bot.`}
              labels={{
                title: "Pursuit AI",
                initial: "Ready. What are we working on?\n\n**New application?** Tell me the client's name and what they need.\n**Existing customer?** Give me their name — I'll pull the full profile.\n**Escrow / tasks / pipeline?** Ask directly or run an agent workflow above.",
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
