import { useState, useEffect, useCallback } from "react";
import { useCopilotChat, useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import {
  useListEscrow, useListHeloc, useListTasks,
  useGetPipelineSummary, useListLoans, useCreateTask
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
              instructions={`You are Pursuit AI, an intelligent operations agent for Pursuit Bank mortgage operations. You have access to live data about:
- Escrow accounts: balances, shortages, disbursements, monthly payments
- HELOC accounts: credit limits, drawn amounts, stages, interest rates
- Loan pipeline: all active loans with stages, borrowers, loan amounts
- Task queue: all open tasks with priorities, due dates, and borrower details

You can take actions:
- Create loan tasks (create_loan_task)
- Get escrow shortages (get_escrow_shortages)
- Get pipeline at-risk loans (get_pipeline_at_risk)
- Get HELOC pending details (get_heloc_pending_details)
- Get overdue tasks (get_overdue_tasks)

When running as an agent:
1. Always use the available tools to get real data before analysing
2. Be specific: include borrower names, loan numbers, dollar amounts, and dates
3. Provide actionable recommendations, not just observations
4. If you identify issues, create tasks to address them
5. Structure your output clearly with sections and bullet points

You are the operations control layer — be precise, data-driven, and action-oriented.`}
              labels={{
                title: "Pursuit AI",
                initial: "I'm ready to help with your operations. Run any agent above, or ask me directly:\n\n• \"What escrow accounts are in shortage?\"\n• \"Summarise today's urgent tasks\"\n• \"Which HELOC applications need review?\"\n• \"What loans are at risk of stalling?\"\n• \"Create a task for loan PB-2025-1038492\"",
              }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
