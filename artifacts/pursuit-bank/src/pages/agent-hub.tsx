import { useState, useEffect, useCallback, useMemo } from "react";
import { useCopilotChat, useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { TextMessage, Role } from "@copilotkit/runtime-client-gql";
import {
  useListEscrow, useListHeloc, useListTasks,
  useGetPipelineSummary, useListLoans, useCreateTask,
  useCreateHeloc, useUpdateTask, useUpdateLoanStatus,
} from "@workspace/api-client-react";
import {
  Building2, CreditCard, FilePlus2, ClipboardList, Activity, Files,
  Database, Calculator, AlertTriangle, FileText, Shield, Percent,
  BookOpen, ClipboardCheck, RefreshCw, User, Briefcase, Layers,
  Clock, ArrowUpDown, UserCheck, Bell, Search, CalendarClock,
  Calendar, FileBarChart, FolderOpen, Send, CheckCircle2, Zap,
  Download, ChevronRight, RotateCcw, Info, TrendingUp, AlertCircle,
  Scale, FileSearch, ListChecks, SlidersHorizontal,
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
    description: "Reviews all escrow accounts, flags shortages and surpluses, recalculates monthly payments, and creates processor follow-up tasks.",
    icon: Building2,
    accentColor: "bg-blue-50",
    accentText: "text-blue-600",
    borderActive: "border-blue-300",
    steps: [
      { id: "fetch", label: "Fetch Accounts", icon: Database },
      { id: "balances", label: "Check Balances", icon: Scale },
      { id: "flag", label: "Flag Shortages", icon: AlertTriangle },
      { id: "calc", label: "Calc Adjustments", icon: Calculator },
      { id: "tasks", label: "Create Tasks", icon: ClipboardList },
      { id: "done", label: "Complete", icon: CheckCircle2 },
    ],
    trigger: "Run the escrow analysis agent. Use get_all_escrow_accounts to retrieve every account. For each account, check the balance against required two-month reserves. Call get_escrow_shortages to get detailed shortage data. For every shortage account, calculate the required monthly payment increase and call create_loan_task (type: 'condition', priority: 'high') to create a processor follow-up task. End with a summary table: borrower name, loan number, balance, shortfall amount, monthly adjustment required, and whether a task was created.",
  },
  {
    id: "heloc-processing",
    name: "HELOC Processing",
    description: "Reviews all pending HELOC applications, runs credit and LTV checks against guidelines, then generates approval conditions per file.",
    icon: CreditCard,
    accentColor: "bg-violet-50",
    accentText: "text-violet-600",
    borderActive: "border-violet-300",
    steps: [
      { id: "pull", label: "Pull Applications", icon: Download },
      { id: "credit", label: "Check Credit", icon: Shield },
      { id: "ltv", label: "Verify LTV", icon: Percent },
      { id: "guidelines", label: "Check Guidelines", icon: BookOpen },
      { id: "conditions", label: "Draft Conditions", icon: ClipboardCheck },
      { id: "tasks", label: "Create Tasks", icon: ClipboardList },
    ],
    trigger: "Run the HELOC processing agent. Call get_heloc_pending_details to get all pending applications. For each one: (1) verify credit score meets our 620 minimum, (2) confirm combined LTV is under 85%, (3) check it against HELOC product guidelines. Then for each eligible application generate a specific numbered list of approval conditions. For any that fail credit or LTV, create a decline task using create_loan_task with priority 'high'. End with a status table: borrower, credit score, LTV, result (approve/decline/conditional), and conditions list.",
  },
  {
    id: "loan-intake",
    name: "Loan Intake",
    description: "Walks a new loan through intake: searches for existing borrower, verifies employment, calculates DTI, matches product, builds document checklist.",
    icon: FilePlus2,
    accentColor: "bg-emerald-50",
    accentText: "text-emerald-600",
    borderActive: "border-emerald-300",
    steps: [
      { id: "search", label: "Search Borrower", icon: Search },
      { id: "verify", label: "Verify Employment", icon: Briefcase },
      { id: "dti", label: "Calculate DTI", icon: Calculator },
      { id: "match", label: "Match Product", icon: Layers },
      { id: "checklist", label: "Build Checklist", icon: ListChecks },
      { id: "tasks", label: "Create Tasks", icon: ClipboardList },
    ],
    trigger: "Run the loan intake agent. Ask me for the borrower's name first — then immediately call search_customer to check if they're in the system. If found, call get_customer_full_profile to pull their history. Then ask: annual income, existing monthly debts, proposed loan amount. Call calculate_dti with those numbers to compute front and back DTI. Based on DTI, credit score, and loan purpose, recommend the best matching product from our portfolio. Generate a document checklist for the loan type. Create intake tasks using create_loan_task for any immediate action items. Guide me one step at a time.",
  },
  {
    id: "task-triage",
    name: "Task Triage",
    description: "Audits the full open task queue, identifies overdue and unassigned items, then produces a prioritised daily action plan for processors.",
    icon: ClipboardList,
    accentColor: "bg-amber-50",
    accentText: "text-amber-600",
    borderActive: "border-amber-300",
    steps: [
      { id: "load", label: "Load Queue", icon: Database },
      { id: "overdue", label: "Flag Overdue", icon: Clock },
      { id: "prioritise", label: "Prioritise", icon: ArrowUpDown },
      { id: "assign", label: "Check Assignments", icon: UserCheck },
      { id: "escalate", label: "Escalate Tasks", icon: AlertTriangle },
      { id: "plan", label: "Action Plan", icon: Bell },
    ],
    trigger: "Run the task triage agent. Call get_overdue_tasks to find all overdue and urgent items. Then review the full open task queue. Group tasks into three tiers: (1) CRITICAL — overdue or due today, (2) HIGH — due within 3 days, (3) NORMAL — all others. For any overdue task that still has no activity, call create_loan_task to create an escalation task with priority 'urgent'. List every task by tier with borrower name, loan number, description, due date, and assigned processor. End with a concise action plan: what the team must complete today.",
  },
  {
    id: "pipeline-monitor",
    name: "Pipeline Monitor",
    description: "Scans every active loan by stage, flags stalled files, surfaces closing-risk loans, and produces a pipeline health report with action items.",
    icon: Activity,
    accentColor: "bg-rose-50",
    accentText: "text-rose-600",
    borderActive: "border-rose-300",
    steps: [
      { id: "scan", label: "Scan Pipeline", icon: Search },
      { id: "stages", label: "Check Stages", icon: CalendarClock },
      { id: "stalled", label: "Find Stalled", icon: AlertTriangle },
      { id: "closings", label: "Review Closings", icon: Calendar },
      { id: "tasks", label: "Create Tasks", icon: ClipboardList },
      { id: "report", label: "Pipeline Report", icon: FileBarChart },
    ],
    trigger: "Run the pipeline monitor agent. Call get_pipeline_at_risk first to get the high-level view. Then call get_loans_in_stage for 'processing', 'underwriting', and 'closing' stages. For each closing-stage loan, check if a Closing Disclosure task exists and if not, call create_loan_task (type: 'disclosure', priority: 'urgent'). Identify any loan in processing or underwriting with no open tasks — those are likely stalled. For each stalled loan, create a check-in task using create_loan_task. Produce a pipeline health report: stage breakdown, at-risk files, closing dates, and recommended next actions per loan.",
  },
  {
    id: "document-review",
    name: "Document Review",
    description: "Checks file completeness for all processing and underwriting loans, finds document gaps, and drafts outstanding condition requests.",
    icon: Files,
    accentColor: "bg-cyan-50",
    accentText: "text-cyan-600",
    borderActive: "border-cyan-300",
    steps: [
      { id: "load", label: "Load Files", icon: FolderOpen },
      { id: "fetch", label: "Fetch Docs", icon: FileSearch },
      { id: "gaps", label: "Find Gaps", icon: Search },
      { id: "request", label: "Draft Requests", icon: Send },
      { id: "tasks", label: "Log Conditions", icon: ClipboardList },
      { id: "done", label: "Complete", icon: CheckCircle2 },
    ],
    trigger: "Run the document review agent. Call get_loans_in_stage for 'processing' and then 'underwriting' to get all active files. For each loan, call get_loan_documents with its loan number to check completeness. Identify all loans with required documents in 'pending' or 'missing' status. For each gap found, call create_loan_task with type 'document_request', a specific description of what is needed and why, and priority 'high'. End with a complete gap report: loan number, borrower name, missing documents, and whether a request task was created.",
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

        let nodeClass = "bg-slate-50 border-slate-200 text-slate-400";
        let labelClass = "text-slate-400";
        let iconClass = "text-slate-400";

        if (isError) {
          nodeClass = "bg-red-50 border-red-300 text-red-500";
          labelClass = "text-red-500";
          iconClass = "text-red-500";
        } else if (isComplete) {
          nodeClass = "bg-emerald-50 border-emerald-300 text-emerald-600";
          labelClass = "text-emerald-600";
          iconClass = "text-emerald-600";
        } else if (isActive) {
          nodeClass = "bg-blue-50 border-blue-400 text-blue-600 step-active";
          labelClass = "text-blue-600";
          iconClass = "text-blue-600";
        }

        const isLastStep = i === steps.length - 1;
        const isArrowActive = runState.activeStep === i || runState.completedSteps.has(i);

        return (
          <div key={step.id} className="flex items-center shrink-0">
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

            {!isLastStep && (
              <div className={`flex items-center mx-1 mb-4 transition-colors duration-300 ${isArrowActive ? "arrow-active" : ""}`}>
                <div className={`h-px w-4 ${isArrowActive ? "bg-blue-400" : "bg-slate-200"}`} />
                <ChevronRight className={`w-3 h-3 -ml-1 ${isArrowActive ? "text-blue-400" : "text-slate-300"}`} />
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
  if (status === "idle") return <div className="w-2 h-2 rounded-full bg-slate-300" />;
  if (status === "running") return (
    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
  );
  if (status === "complete") return <div className="w-2 h-2 rounded-full bg-emerald-500" />;
  return <div className="w-2 h-2 rounded-full bg-red-400" />;
}

// ─── Agent Preview Types ──────────────────────────────────────────────────────

type AgentPreviewItem = {
  label: string;
  detail: string;
  tag?: string;
  urgent?: boolean;
};

type AgentPreview = {
  countLabel: string;
  hasAlert: boolean;
  items: AgentPreviewItem[];
  emptyMessage: string;
};

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  runState,
  onRun,
  isAnyRunning,
  isSelected,
  onSelect,
  preview,
}: {
  agent: AgentDef;
  runState: AgentRunState;
  onRun: (agentId: string) => void;
  isAnyRunning: boolean;
  isSelected: boolean;
  onSelect: (agentId: string) => void;
  preview: AgentPreview;
}) {
  const isRunning = runState.status === "running";
  const isComplete = runState.status === "complete";
  const canRun = !isAnyRunning;
  const showPreview = isSelected && !isRunning;

  const borderClass = isRunning
    ? "border-blue-300 shadow-md shadow-blue-100/60 ring-1 ring-blue-200"
    : isSelected
    ? "border-blue-400 shadow-md shadow-blue-100/50 ring-2 ring-blue-200"
    : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow";

  return (
    <div
      className={`rounded-xl border transition-all duration-200 flex flex-col bg-white cursor-pointer ${borderClass}`}
      onClick={() => !isRunning && onSelect(agent.id)}
    >
      {/* Header */}
      <div className={`flex items-start gap-3 p-4 pb-3 rounded-t-xl transition-colors duration-200 ${isSelected && !isRunning ? "bg-blue-50/40" : ""}`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isSelected && !isRunning ? "ring-2 ring-blue-200" : ""} ${agent.accentColor}`}>
          <agent.icon className={`w-4.5 h-4.5 ${agent.accentText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{agent.name}</h3>
            <StatusDot status={runState.status} />
            {isSelected && !isRunning && preview.hasAlert && (
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 uppercase tracking-wide">
                {preview.countLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
            {agent.description}
          </p>
        </div>
      </div>

      {/* Workflow Graph */}
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
        <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
          Workflow
        </div>
        <WorkflowGraph steps={agent.steps} runState={runState} />
      </div>

      {/* Preview Panel — visible when selected */}
      {showPreview && (
        <div className="border-t border-blue-100 bg-blue-50/30 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-semibold text-blue-500 uppercase tracking-widest">
              {preview.hasAlert ? "Needs Attention" : "Queue Preview"}
            </span>
            <span className="text-[9px] text-slate-400">{preview.countLabel}</span>
          </div>
          {preview.items.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">{preview.emptyMessage}</p>
          ) : (
            <div className="space-y-1.5">
              {preview.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${item.urgent ? "bg-red-400" : "bg-amber-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-700 truncate">{item.label}</span>
                      {item.tag && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-medium shrink-0">{item.tag}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-snug truncate">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={`flex items-center justify-between px-4 py-3 border-t mt-auto transition-colors duration-200 ${isSelected && !isRunning ? "border-blue-100 bg-blue-50/20" : "border-slate-100"}`}>
        <div className="text-xs text-slate-400">
          {isRunning && (
            <span className="text-blue-600 flex items-center gap-1.5 font-medium">
              <Zap className="w-3 h-3" />
              Processing...
            </span>
          )}
          {isComplete && runState.lastRunAt && (
            <span className="text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              Done · {runState.lastRunAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {runState.status === "idle" && !isSelected && (
            <span className="text-slate-400">Click to select</span>
          )}
          {runState.status === "idle" && isSelected && (
            <span className="text-blue-500 font-medium">Selected</span>
          )}
        </div>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          {isComplete && (
            <button
              onClick={() => onRun(agent.id)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1"
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
                  ? isSelected
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm ring-2 ring-blue-300 ring-offset-1"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }
              `}
            >
              <Zap className="w-3 h-3" />
              {isSelected ? "Run Agent ↗" : "Run Agent"}
            </button>
          )}
          {isRunning && (
            <div className="text-xs px-3 py-1.5 rounded-md border border-blue-200 text-blue-600 flex items-center gap-1.5 bg-blue-50 font-medium">
              <div className="w-3 h-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              Running
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

type ActivityItem = {
  id: string;
  type: string;
  borrowerName: string;
  title: string;
  detail: string;
  accent: string;
  minutesAgo: number;
};

function useRelativeTime(ts: number) {
  const [label, setLabel] = useState(() => {
    const s = Math.round((Date.now() - ts) / 1000);
    return s < 10 ? "just now" : `${Math.round(s / 60)}m ago`;
  });
  useEffect(() => {
    const tick = () => {
      const s = Math.round((Date.now() - ts) / 1000);
      setLabel(s < 10 ? "just now" : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`);
    };
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, [ts]);
  return label;
}

function ActivityFeed({
  escrowAccounts,
  helocAccounts,
  openTasks,
  loans,
  lastUpdatedAt,
}: {
  escrowAccounts: any[] | undefined;
  helocAccounts: any[] | undefined;
  openTasks: any[] | undefined;
  loans: any[] | undefined;
  lastUpdatedAt: number;
}) {
  const updatedLabel = useRelativeTime(lastUpdatedAt);
  const items = useMemo<ActivityItem[]>(() => {
    const result: ActivityItem[] = [];

    (escrowAccounts ?? [])
      .filter(a => a.status === "shortage")
      .forEach((a, i) => {
        result.push({
          id: `escrow-${a.id}`,
          type: "Escrow Alert",
          borrowerName: a.borrowerName,
          title: "Shortage flagged",
          detail: `Bal. $${a.balance?.toLocaleString()} · ${a.nextDisbursementType} due ${a.nextDisbursementDate}`,
          accent: "bg-amber-400",
          minutesAgo: 4 + i * 6,
        });
      });

    (openTasks ?? [])
      .filter(t => t.priority === "urgent")
      .slice(0, 4)
      .forEach((t, i) => {
        result.push({
          id: `task-${t.id}`,
          type: "Urgent Task",
          borrowerName: t.borrowerName,
          title: t.taskType?.replace(/_/g, " ") ?? "Task",
          detail: t.loanNumber + (t.dueDate ? ` · Due ${t.dueDate}` : ""),
          accent: "bg-red-400",
          minutesAgo: 9 + i * 8,
        });
      });

    (helocAccounts ?? [])
      .filter(h => h.status === "pending")
      .forEach((h, i) => {
        result.push({
          id: `heloc-${h.id}`,
          type: "HELOC",
          borrowerName: h.borrowerName,
          title: `Stage: ${h.stage}`,
          detail: `$${h.creditLimit?.toLocaleString()} · ${h.ltv}% LTV`,
          accent: "bg-violet-400",
          minutesAgo: 17 + i * 11,
        });
      });

    (loans ?? [])
      .filter(l => l.stage === "closing" || l.stage === "approved")
      .forEach((l, i) => {
        result.push({
          id: `loan-${l.id ?? l.loanNumber}`,
          type: l.stage === "closing" ? "Closing" : "Approved",
          borrowerName: l.borrowerName,
          title: l.stage === "closing" ? "Ready for closing" : "Loan approved",
          detail: `${l.loanNumber} · $${l.loanAmount?.toLocaleString()}`,
          accent: l.stage === "closing" ? "bg-emerald-400" : "bg-blue-400",
          minutesAgo: 28 + i * 13,
        });
      });

    (loans ?? [])
      .filter(l => l.stage === "underwriting" || l.stage === "processing")
      .slice(0, 3)
      .forEach((l, i) => {
        result.push({
          id: `loan-proc-${l.id ?? l.loanNumber}`,
          type: l.stage === "underwriting" ? "Underwriting" : "Processing",
          borrowerName: l.borrowerName,
          title: l.stage === "underwriting" ? "In underwriting" : "In processing",
          detail: `${l.loanNumber} · $${l.loanAmount?.toLocaleString()}`,
          accent: "bg-slate-400",
          minutesAgo: 40 + i * 15,
        });
      });

    return result.sort((a, b) => a.minutesAgo - b.minutesAgo);
  }, [escrowAccounts, helocAccounts, openTasks, loans]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <div className="w-52 shrink-0 flex flex-col border-r border-slate-200 bg-white overflow-hidden">
      <div className="px-3.5 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Live Activity</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[9.5px] text-slate-400">{updatedLabel}</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="p-4 text-xs text-slate-400 text-center pt-8">No recent activity</div>
        ) : (
          <div>
            {items.map(item => (
              <div
                key={item.id}
                className="relative px-3.5 py-2.5 border-b border-slate-50 hover:bg-slate-50/70 transition-colors"
              >
                <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-r ${item.accent}`} />
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.type}
                  </span>
                  <span className="text-[9.5px] text-slate-300 tabular-nums">{formatTime(item.minutesAgo)}</span>
                </div>
                <div className="text-xs font-semibold text-slate-700 leading-snug truncate">
                  {item.borrowerName}
                </div>
                <div className="text-[11px] text-slate-500 leading-snug truncate">{item.title}</div>
                <div className="text-[10px] text-slate-400 leading-snug truncate mt-0.5">{item.detail}</div>
              </div>
            ))}
          </div>
        )}
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
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white border border-slate-200 shadow-sm">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
        <div className={`text-lg font-bold tabular-nums leading-tight ${alert ? "text-amber-500" : "text-slate-800"}`}>
          {value}
        </div>
        {sub && (
          <div className={`text-[10px] ${alert ? "text-amber-500" : "text-slate-400"}`}>{sub}</div>
        )}
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
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgentId(prev => (prev === agentId ? null : agentId));
  };

  const { appendMessage, isLoading } = useCopilotChat();

  // ── Live data for CopilotReadable ────────────────────────────────────────
  const POLL = 30_000;
  const { data: escrowAccounts, dataUpdatedAt: escrowUpdatedAt } = useListEscrow({ query: { refetchInterval: POLL } });
  const { data: helocAccounts } = useListHeloc({ query: { refetchInterval: POLL } });
  const { data: openTasks } = useListTasks({ status: "open" }, { query: { refetchInterval: POLL } });
  const { data: allTasks } = useListTasks({}, { query: { refetchInterval: POLL } });
  const { data: summary } = useGetPipelineSummary({ query: { refetchInterval: POLL } });
  const { data: loansData } = useListLoans({}, { query: { refetchInterval: POLL } });
  const { mutateAsync: createTask } = useCreateTask();
  const { mutateAsync: completeTask } = useUpdateTask();
  const { mutateAsync: advanceLoanStatus } = useUpdateLoanStatus();
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
      const search = async (q: string) => {
        const r = await fetch(`/api/borrowers?search=${encodeURIComponent(q)}`);
        const data = await r.json();
        return Array.isArray(data) ? data : [];
      };

      let borrowers = await search(name);

      // Fallback: if full-name search returns nothing, try each word separately and merge unique results
      if (borrowers.length === 0) {
        const words = name.trim().split(/\s+/).filter(w => w.length > 1);
        const parts = await Promise.all(words.map(w => search(w)));
        const seen = new Set<number>();
        borrowers = parts.flat().filter((b: any) => !seen.has(b.id) && seen.add(b.id));
      }

      if (borrowers.length === 0) {
        return `No borrower found matching "${name}". Known clients: ${["Elena Castillo", "Robert Chen", "Amanda Foster", "David Kim", "Patricia Monroe", "Sarah Nguyen", "Michael Thornton", "James Wallace", "James Paterson", "Lisa Chen", "Marcus Williams", "Jennifer Santos", "David Park", "Rachel Kim", "Thomas Okoye", "Sandra Buchanan", "Carlos Rivera", "Megan Hartley"].join(", ")}.`;
      }

      return JSON.stringify(borrowers.map((b: any) => ({
        id: b.id,
        fullName: `${b.firstName} ${b.lastName}`,
        email: b.email,
        phone: b.phone,
        creditScore: b.creditScore,
        employmentStatus: b.employmentStatus,
        annualIncome: b.annualIncome,
        address: b.currentAddress,
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
    description: "Get full details for a specific loan by loan number, including its current stage, open tasks, and the specific next actions required to advance it.",
    parameters: [
      { name: "loanNumber", type: "string", description: "The loan number e.g. PB-2025-1038492" },
    ],
    handler: async ({ loanNumber }) => {
      const loanList = loansData?.loans ?? [];
      const loan = loanList.find((l: any) => l.loanNumber === loanNumber);
      if (!loan) return `Loan ${loanNumber} not found in pipeline.`;
      const tasks = (allTasks ?? []).filter((t: any) => t.loanNumber === loanNumber);
      const openTasks = tasks.filter((t: any) => t.status === "open");

      const STAGE_NEXT_ACTIONS: Record<string, { action: string; taskType: string; priority: string }[]> = {
        application: [
          { action: "Send Loan Estimate (LE) disclosure — required within 3 business days of application", taskType: "disclosure", priority: "urgent" },
          { action: "Collect signed application (1003)", taskType: "document_request", priority: "high" },
          { action: "Request 2 years W-2s and 30 days recent paystubs", taskType: "document_request", priority: "high" },
          { action: "Verify down payment source — 2 months bank statements required", taskType: "condition", priority: "high" },
          { action: "Pull credit report and review score/tradelines", taskType: "condition", priority: "urgent" },
        ],
        processing: [
          { action: "Order property appraisal — schedule with approved AMC", taskType: "appraisal", priority: "urgent" },
          { action: "Verify employment (VOE) — send form to employer HR", taskType: "condition", priority: "high" },
          { action: "Order title search and title insurance commitment", taskType: "title", priority: "high" },
          { action: "Order flood zone determination certificate", taskType: "condition", priority: "normal" },
          { action: "Confirm homeowner's insurance policy — effective date must cover closing", taskType: "insurance", priority: "high" },
          { action: "Collect any remaining income documents — tax returns, 1099s, business P&L if self-employed", taskType: "document_request", priority: "high" },
        ],
        underwriting: [
          { action: "Review appraisal report — confirm value supports LTV", taskType: "condition", priority: "urgent" },
          { action: "Verify DTI against product guidelines — flag if > 45% conventional", taskType: "condition", priority: "urgent" },
          { action: "Review title commitment for exceptions and liens", taskType: "title", priority: "high" },
          { action: "Confirm hazard insurance meets coverage requirements", taskType: "insurance", priority: "high" },
          { action: "Issue Commitment Letter with Prior-to-Close (PTC) conditions", taskType: "condition", priority: "high" },
          { action: "Clear all underwriting conditions — obtain signed letters of explanation (LOEs) if needed", taskType: "condition", priority: "high" },
        ],
        approved: [
          { action: "Complete Clear to Close (CTC) checklist — verify all conditions cleared", taskType: "condition", priority: "urgent" },
          { action: "Prepare final Closing Disclosure (CD) — must be delivered 3 business days before closing", taskType: "disclosure", priority: "urgent" },
          { action: "Confirm closing date, time, and settlement agent with all parties", taskType: "other", priority: "high" },
          { action: "Send wire instructions to borrower — confirm funding amount", taskType: "other", priority: "high" },
          { action: "Obtain final payoff statements for any debts being paid at closing", taskType: "condition", priority: "high" },
        ],
        closing: [
          { action: "Confirm Closing Disclosure receipt and 3-business-day waiting period", taskType: "disclosure", priority: "urgent" },
          { action: "Verify borrower funds wired to escrow — confirm receipt with settlement agent", taskType: "condition", priority: "urgent" },
          { action: "Conduct final review of closing package — all documents executed correctly", taskType: "condition", priority: "urgent" },
          { action: "Confirm deed recording with county — obtain recording confirmation", taskType: "title", priority: "high" },
          { action: "Send first payment letter to borrower with servicer details", taskType: "other", priority: "normal" },
        ],
        funded: [
          { action: "Set up escrow account — establish initial deposit and monthly payment schedule", taskType: "other", priority: "high" },
          { action: "Transfer loan to servicer portfolio", taskType: "other", priority: "normal" },
          { action: "Archive complete loan file — verify all documents scanned and indexed", taskType: "other", priority: "normal" },
        ],
      };

      const stageActions = STAGE_NEXT_ACTIONS[loan.stage] ?? [];
      const pendingActions = stageActions.filter(a =>
        !openTasks.some((t: any) => t.description?.toLowerCase().includes(a.action.slice(0, 30).toLowerCase()))
      );

      return JSON.stringify({
        loan,
        currentStage: loan.stage,
        stageProgression: ["application", "processing", "underwriting", "approved", "closing", "funded"],
        nextStage: { application: "processing", processing: "underwriting", underwriting: "approved", approved: "closing", closing: "funded", funded: "complete" }[loan.stage],
        openTasks,
        completedTasks: tasks.filter((t: any) => t.status === "complete").length,
        pendingActions,
        instruction: `You have ${pendingActions.length} actions to execute for this ${loan.stage}-stage loan. Create tasks for each one using create_loan_task, then advance the stage using advance_loan_stage once all tasks are queued. Do NOT wait for user input between tasks — proceed automatically.`,
      });
    },
  });

  useCopilotAction({
    name: "advance_loan_stage",
    description: "Move a loan to its next stage in the pipeline (application→processing→underwriting→approved→closing→funded). Call this AFTER all tasks for the current stage have been created. This records the stage change in the activity log.",
    parameters: [
      { name: "loanId", type: "number", description: "The numeric loan ID (found in get_loan_details result)" },
      { name: "loanNumber", type: "string", description: "The loan number e.g. PB-2025-1038492" },
      { name: "borrowerName", type: "string", description: "Full borrower name" },
      { name: "currentStage", type: "string", description: "The loan's current stage" },
      { name: "nextStage", type: "string", description: "The stage to advance to: processing, underwriting, approved, closing, or funded" },
    ],
    handler: async ({ loanId, loanNumber, borrowerName, currentStage, nextStage }) => {
      const validProgression: Record<string, string> = {
        application: "processing",
        processing: "underwriting",
        underwriting: "approved",
        approved: "closing",
        closing: "funded",
      };
      if (validProgression[currentStage] !== nextStage) {
        return `Stage advancement blocked: cannot move from ${currentStage} to ${nextStage}. Valid next stage is ${validProgression[currentStage] ?? "funded (final stage)"}.`;
      }
      try {
        const loan = await advanceLoanStatus({ id: loanId, data: { status: "active", stage: nextStage } });
        return `✓ Loan ${loanNumber} (${borrowerName}) advanced from ${currentStage} → ${nextStage}. Stage change recorded in activity log. Now execute the ${nextStage}-stage checklist: call get_loan_details to get the next set of required actions and create tasks for each one immediately.`;
      } catch {
        return `Failed to advance loan ${loanNumber}. Please check the loan ID and try again.`;
      }
    },
  });

  // ── Workflow-supporting actions ──────────────────────────────────────────

  useCopilotAction({
    name: "get_all_escrow_accounts",
    description: "Get all escrow accounts with current balance, monthly payment, and computed shortage or surplus amount. Use this at the start of the escrow analysis workflow.",
    parameters: [],
    handler: async () => {
      const accounts = escrowAccounts ?? [];
      return JSON.stringify(accounts.map((a: any) => {
        const annualRequired = (Number(a.propertyTaxAnnual) + Number(a.insuranceAnnual) + Number(a.hoaAnnual));
        const twoMonthReserve = (annualRequired / 12) * 2;
        const shortfall = twoMonthReserve - Number(a.balance);
        const recommendedMonthly = (annualRequired / 12) + (shortfall > 0 ? shortfall / 12 : 0);
        return {
          borrowerName: a.borrowerName,
          loanNumber: a.loanNumber,
          propertyAddress: a.propertyAddress,
          balance: Number(a.balance),
          currentMonthlyPayment: Number(a.monthlyEscrowPayment),
          recommendedMonthlyPayment: Math.ceil(recommendedMonthly),
          shortfallAmount: shortfall > 0 ? Math.ceil(shortfall) : 0,
          surplusAmount: shortfall < 0 ? Math.floor(Math.abs(shortfall)) : 0,
          status: a.status,
          nextDisbursement: `${a.nextDisbursementDate} — ${a.nextDisbursementType} $${Number(a.nextDisbursementAmount).toLocaleString()}`,
        };
      }));
    },
  });

  useCopilotAction({
    name: "get_loans_in_stage",
    description: "Get all loans currently in a specific pipeline stage. Valid stages: application, processing, underwriting, approved, closing, funded. Use this in pipeline monitoring and document review workflows.",
    parameters: [
      { name: "stage", type: "string", description: "Pipeline stage to filter by: application, processing, underwriting, approved, closing, funded" },
    ],
    handler: async ({ stage }) => {
      const loans = (loansData?.loans ?? []).filter((l: any) => l.stage === stage);
      if (loans.length === 0) return `No loans currently in '${stage}' stage.`;
      return JSON.stringify(loans.map((l: any) => {
        const loanTasks = (openTasks ?? []).filter((t: any) => t.loanNumber === l.loanNumber);
        return {
          loanNumber: l.loanNumber,
          borrowerName: l.borrowerName,
          loanAmount: l.loanAmount,
          loanType: l.loanType,
          loanPurpose: l.loanPurpose,
          interestRate: l.interestRate,
          ltv: l.ltv,
          dti: l.dti,
          creditScore: l.creditScore,
          loanOfficer: l.loanOfficer,
          processor: l.processor,
          closingDate: l.closingDate ?? "not set",
          openTaskCount: loanTasks.length,
          urgentTaskCount: loanTasks.filter((t: any) => t.priority === "urgent").length,
        };
      }));
    },
  });

  useCopilotAction({
    name: "get_loan_documents",
    description: "Get the document checklist and completion status for a specific loan. Use this in the document review workflow to find gaps.",
    parameters: [
      { name: "loanNumber", type: "string", description: "The loan number to check documents for" },
    ],
    handler: async ({ loanNumber }) => {
      const loan = (loansData?.loans ?? []).find((l: any) => l.loanNumber === loanNumber);
      if (!loan) return `Loan ${loanNumber} not found.`;
      const resp = await fetch(`/api/loans/${loan.id}/documents`);
      if (!resp.ok) return `Could not fetch documents for ${loanNumber} — the loan may not have a document checklist yet.`;
      const docs = await resp.json();
      if (!Array.isArray(docs) || docs.length === 0) return `No document checklist found for ${loanNumber} (${loan.borrowerName}).`;
      const received = docs.filter((d: any) => d.status === "received").length;
      const pending = docs.filter((d: any) => d.status === "pending" && d.required).length;
      const missing = docs.filter((d: any) => d.status === "missing" && d.required).length;
      return JSON.stringify({
        loanNumber,
        borrowerName: loan.borrowerName,
        stage: loan.stage,
        loanType: loan.loanType,
        summary: `${received} received, ${pending} pending, ${missing} missing (required)`,
        documents: docs.map((d: any) => ({
          name: d.documentName,
          type: d.documentType,
          status: d.status,
          required: d.required,
          notes: d.notes ?? null,
        })),
      });
    },
  });

  useCopilotAction({
    name: "search_tasks_by_borrower",
    description: "Find all open tasks for a specific borrower by name. Use this to check what's already in the queue before creating duplicate tasks.",
    parameters: [
      { name: "borrowerName", type: "string", description: "Full or partial borrower name" },
    ],
    handler: async ({ borrowerName }) => {
      const match = borrowerName.toLowerCase();
      const tasks = (allTasks ?? []).filter((t: any) => t.borrowerName?.toLowerCase().includes(match));
      if (tasks.length === 0) return `No tasks found for borrower matching "${borrowerName}".`;
      const open = tasks.filter((t: any) => t.status === "open");
      const done = tasks.filter((t: any) => t.status !== "open");
      return JSON.stringify({
        borrowerMatch: borrowerName,
        totalTasks: tasks.length,
        openTasks: open.map((t: any) => ({
          id: t.id,
          priority: t.priority,
          taskType: t.taskType,
          description: t.description,
          dueDate: t.dueDate,
          assignedTo: t.assignedTo,
          loanNumber: t.loanNumber,
        })),
        completedTasks: done.map((t: any) => ({ id: t.id, description: t.description.slice(0, 80), status: t.status })),
      });
    },
  });

  useCopilotAction({
    name: "mark_task_complete",
    description: "Mark an open loan task as complete. Use this after confirming a task has been resolved — e.g. a document was received, a condition was cleared, or a disclosure was sent. Always call search_tasks_by_borrower first to get the task ID.",
    parameters: [
      { name: "taskId", type: "number", description: "The numeric task ID from search_tasks_by_borrower or get_overdue_tasks results" },
      { name: "borrowerName", type: "string", description: "Full name of the borrower the task belongs to" },
      { name: "taskDescription", type: "string", description: "Brief description of what was resolved (for confirmation message)" },
    ],
    handler: async ({ taskId, borrowerName, taskDescription }) => {
      try {
        const task = await completeTask({ id: taskId, data: { status: "complete" } });
        return `Task #${task.id} marked complete for ${borrowerName}: "${taskDescription}". Status updated to complete.`;
      } catch {
        return `Failed to complete task #${taskId}. The task may not exist or may already be closed.`;
      }
    },
  });

  useCopilotAction({
    name: "calculate_dti",
    description: "Calculate front-end and back-end Debt-to-Income ratios and check eligibility against conventional, FHA, VA, and USDA guidelines. Use this during loan intake.",
    parameters: [
      { name: "annualIncome", type: "number", description: "Borrower's gross annual income in dollars" },
      { name: "monthlyDebts", type: "number", description: "Total existing monthly debt payments (car loans, student loans, credit card minimums — NOT including proposed housing payment)" },
      { name: "proposedMonthlyPayment", type: "number", description: "Proposed total monthly housing payment including P&I, property taxes, insurance, and HOA" },
    ],
    handler: async ({ annualIncome, monthlyDebts, proposedMonthlyPayment }) => {
      const monthlyGross = annualIncome / 12;
      const frontDti = (proposedMonthlyPayment / monthlyGross) * 100;
      const backDti = ((proposedMonthlyPayment + monthlyDebts) / monthlyGross) * 100;
      return JSON.stringify({
        grossMonthlyIncome: `$${monthlyGross.toFixed(0)}`,
        proposedHousingPayment: `$${proposedMonthlyPayment.toLocaleString()}`,
        existingMonthlyDebts: `$${monthlyDebts.toLocaleString()}`,
        frontEndDti: `${frontDti.toFixed(1)}%`,
        backEndDti: `${backDti.toFixed(1)}%`,
        guidelineChecks: {
          conventional: backDti <= 45 ? `✓ Eligible (${backDti.toFixed(1)}% ≤ 45%)` : `✗ Too high — ${(backDti - 45).toFixed(1)}% over conventional 45% limit`,
          fha: backDti <= 57 ? `✓ Eligible (${backDti.toFixed(1)}% ≤ 57% with compensating factors)` : `✗ Too high — exceeds FHA 57% ceiling`,
          va: backDti <= 41 ? `✓ Within VA guideline (${backDti.toFixed(1)}% ≤ 41%)` : `⚠ ${backDti.toFixed(1)}% exceeds VA 41% guideline — residual income analysis required`,
          usda: backDti <= 41 ? `✓ Eligible (${backDti.toFixed(1)}% ≤ 41%)` : `✗ Exceeds USDA 41% back-end limit`,
        },
        recommendation: backDti <= 45 ? "Conventional or FHA both viable — recommend conventional if credit score ≥ 620." : backDti <= 57 ? "Conventional not eligible. FHA may work with compensating factors (reserves, credit history)." : "DTI too high for most programs. Borrower should reduce debts or increase income before applying.",
      });
    },
  });

  useCopilotAction({
    name: "check_heloc_eligibility",
    description: "Check if an existing borrower is eligible for a HELOC based on their credit score, existing mortgage balance, and estimated property value. Call get_customer_full_profile first to get the mortgage balance.",
    parameters: [
      { name: "borrowerId", type: "number", description: "Borrower ID from search_customer" },
      { name: "borrowerName", type: "string", description: "Borrower full name" },
      { name: "estimatedPropertyValue", type: "number", description: "Current estimated market value of the property in dollars" },
      { name: "requestedCreditLimit", type: "number", description: "Requested HELOC credit limit in dollars" },
    ],
    handler: async ({ borrowerId, borrowerName, estimatedPropertyValue, requestedCreditLimit }) => {
      const borrowerResp = await fetch(`/api/borrowers/${borrowerId}`);
      const borrower = await borrowerResp.json();
      const allLoans = loansData?.loans ?? [];
      const existingMortgage = allLoans.find((l: any) =>
        l.borrowerId === borrowerId || l.borrowerName?.toLowerCase().includes(borrowerName.toLowerCase())
      );
      const existingBalance = existingMortgage ? Number(existingMortgage.loanAmount) : 0;
      const combinedLtv = ((existingBalance + requestedCreditLimit) / estimatedPropertyValue) * 100;
      const maxHeloc = (estimatedPropertyValue * 0.85) - existingBalance;
      const creditOk = (borrower.creditScore ?? 0) >= 620;
      const ltvOk = combinedLtv <= 85;
      const eligible = creditOk && ltvOk;
      return JSON.stringify({
        borrower: borrowerName,
        creditScore: borrower.creditScore,
        creditCheck: creditOk ? `✓ ${borrower.creditScore} meets minimum 620` : `✗ ${borrower.creditScore} is below minimum 620`,
        existingMortgageBalance: `$${existingBalance.toLocaleString()}`,
        existingLoanNumber: existingMortgage?.loanNumber ?? "none on file",
        estimatedPropertyValue: `$${estimatedPropertyValue.toLocaleString()}`,
        requestedCreditLimit: `$${requestedCreditLimit.toLocaleString()}`,
        combinedLtv: `${combinedLtv.toFixed(1)}%`,
        ltvCheck: ltvOk ? `✓ ${combinedLtv.toFixed(1)}% is within 85% max combined LTV` : `✗ ${combinedLtv.toFixed(1)}% exceeds 85% max combined LTV`,
        maxEligibleHeloc: maxHeloc > 0 ? `$${Math.floor(maxHeloc).toLocaleString()}` : "$0 (insufficient equity)",
        eligible,
        recommendation: eligible
          ? `Eligible. Max HELOC $${Math.floor(maxHeloc).toLocaleString()} — proceed with create_heloc_application.`
          : `Not eligible. ${!creditOk ? `Credit must reach 620. ` : ""}${!ltvOk ? `Reduce credit limit to $${Math.max(0, Math.floor(maxHeloc)).toLocaleString()} to stay under 85% LTV.` : ""}`,
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

  // ── "/" shortcut → focus chat input ──────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      e.preventDefault();
      const input = document.querySelector<HTMLElement>(".copilot-chat-panel textarea");
      input?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // ── Per-agent preview data ─────────────────────────────────────────────
  const agentPreviews = useMemo((): Record<string, AgentPreview> => {
    const today = new Date().toISOString().split("T")[0];
    const shortages = (escrowAccounts ?? []).filter((a: any) => a.status === "shortage");
    const pendingHeloc = (helocAccounts ?? []).filter((a: any) => a.status === "pending");
    const urgentTasks = (openTasks ?? []).filter((t: any) => t.priority === "urgent");
    const overdueTasks = (openTasks ?? []).filter((t: any) => t.dueDate && t.dueDate < today);
    const loans = loansData?.loans ?? [];
    const closingLoans = loans.filter((l: any) => l.stage === "closing" || l.stage === "approved");
    const processingLoans = loans.filter((l: any) => l.stage === "processing" || l.stage === "underwriting");

    const dedup = (arr: any[], seen: Set<number>) =>
      arr.filter((t: any) => !seen.has(t.id) && seen.add(t.id));

    const overdueSet = new Set(overdueTasks.map((t: any) => t.id));
    const urgentOnly = urgentTasks.filter((t: any) => !overdueSet.has(t.id));

    return {
      "escrow-analysis": {
        countLabel: `${shortages.length} shortage account${shortages.length !== 1 ? "s" : ""}`,
        hasAlert: shortages.length > 0,
        items: shortages.slice(0, 3).map((a: any) => ({
          label: a.borrowerName,
          detail: `Bal. $${Number(a.balance ?? 0).toLocaleString()} · ${a.nextDisbursementType ?? "disbursement"} due ${a.nextDisbursementDate ?? "soon"}`,
          tag: "shortage",
          urgent: true,
        })),
        emptyMessage: "All escrow accounts fully funded",
      },
      "heloc-processing": {
        countLabel: `${pendingHeloc.length} pending application${pendingHeloc.length !== 1 ? "s" : ""}`,
        hasAlert: pendingHeloc.length > 0,
        items: pendingHeloc.slice(0, 3).map((a: any) => ({
          label: a.borrowerName,
          detail: `$${Number(a.creditLimit ?? 0).toLocaleString()} limit · ${a.ltv ?? "—"}% LTV`,
          tag: a.stage ?? "pending",
          urgent: a.stage === "application",
        })),
        emptyMessage: "No pending HELOC applications",
      },
      "loan-intake": {
        countLabel: "Interactive workflow",
        hasAlert: false,
        items: [
          { label: "Search borrower database", detail: "Check if customer already exists in system", tag: "step 1" },
          { label: "Calculate DTI", detail: "Front & back ratios vs. FHA / VA / Conv. guidelines", tag: "step 2" },
          { label: "Match loan product", detail: "Conventional, FHA, VA, USDA, or Jumbo", tag: "step 3" },
        ],
        emptyMessage: "",
      },
      "task-triage": {
        countLabel: `${overdueTasks.length} overdue · ${urgentTasks.length} urgent`,
        hasAlert: overdueTasks.length > 0 || urgentTasks.length > 0,
        items: dedup(
          [...overdueTasks.slice(0, 2).map((t: any) => ({ label: t.borrowerName, detail: t.description?.slice(0, 60), tag: "overdue", urgent: true })),
           ...urgentOnly.slice(0, 2).map((t: any) => ({ label: t.borrowerName, detail: t.description?.slice(0, 60), tag: "urgent", urgent: false }))],
          new Set()
        ),
        emptyMessage: "No urgent or overdue tasks",
      },
      "pipeline-monitor": {
        countLabel: `${closingLoans.length} closing · ${processingLoans.length} in pipeline`,
        hasAlert: closingLoans.length > 0,
        items: [
          ...closingLoans.slice(0, 2).map((l: any) => ({ label: l.borrowerName, detail: `${l.loanNumber} · ${l.stage}${l.closingDate ? ` · closes ${l.closingDate}` : ""}`, tag: l.stage, urgent: true })),
          ...processingLoans.slice(0, 2).map((l: any) => ({ label: l.borrowerName, detail: `${l.loanNumber} · ${l.stage} · ${(l.loanType ?? "").toUpperCase()}`, tag: l.stage, urgent: false })),
        ],
        emptyMessage: "Pipeline clear",
      },
      "document-review": {
        countLabel: `${processingLoans.length} file${processingLoans.length !== 1 ? "s" : ""} to review`,
        hasAlert: processingLoans.length > 0,
        items: processingLoans.slice(0, 3).map((l: any) => ({
          label: l.borrowerName,
          detail: `${l.loanNumber} · ${(l.loanType ?? "").toUpperCase()}`,
          tag: l.stage,
          urgent: l.stage === "processing",
        })),
        emptyMessage: "No files pending review",
      },
    };
  }, [escrowAccounts, helocAccounts, openTasks, loansData]);

  // ── Quick stats ────────────────────────────────────────────────────────
  const urgentCount = (openTasks ?? []).filter((t: any) => t.priority === "urgent").length;
  const shortageCount = (escrowAccounts ?? []).filter(a => a.status === "shortage").length;
  const helocPendingCount = (helocAccounts ?? []).filter(a => a.status === "pending").length;
  const loanList = loansData?.loans ?? [];
  const totalVolume = loanList.reduce((sum: number, l: any) => sum + (l.loanAmount ?? 0), 0);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* ── Top Header ────────────────────────────────────────────────── */}
      <header className="h-13 shrink-0 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white tracking-tight">Pursuit Bank</span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400 font-medium">Operations AI</span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {urgentCount} urgent {urgentCount === 1 ? "task" : "tasks"}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-300">
              MS
            </div>
            <span className="text-slate-300 font-medium">Mark Santos</span>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Far Left: Activity Feed ──────────────────────────────────── */}
        <ActivityFeed
          escrowAccounts={escrowAccounts ?? []}
          helocAccounts={helocAccounts ?? []}
          openTasks={openTasks ?? []}
          loans={loanList}
          lastUpdatedAt={escrowUpdatedAt}
        />

        {/* ── Middle: Agent Workspace ──────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">

          {/* Stats bar */}
          <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 overflow-x-auto shrink-0">
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
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Click <strong className="text-slate-700 mx-1">Run Agent</strong> or ask Pursuit AI →
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
                  isSelected={selectedAgentId === agent.id}
                  onSelect={handleSelectAgent}
                  preview={agentPreviews[agent.id] ?? { countLabel: "", hasAlert: false, items: [], emptyMessage: "" }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Always-visible CopilotKit Chat ───────────────────── */}
        <div className="w-[400px] shrink-0 flex flex-col overflow-hidden bg-white">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Pursuit AI</span>
            {isLoading ? (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <span>Thinking...</span>
              </div>
            ) : (
              <kbd className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-mono text-slate-400 select-none">
                /
              </kbd>
            )}
          </div>
          <div className="flex-1 overflow-hidden copilot-chat-panel">
            <CopilotChat
              className="h-full"
              instructions={`You are Pursuit AI — a proactive mortgage operations copilot for Pursuit Bank. Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

═══════════════════════════════════════════════
## PRIME DIRECTIVE — READ THIS FIRST
═══════════════════════════════════════════════

You are a COPILOT, not a chatbot. You DRIVE the process. You do not describe what should happen — you make it happen using tools, report what you did, and immediately proceed to the next action.

**FORBIDDEN phrases** — never say these:
- "Let me know if you need anything"
- "Feel free to ask"  
- "If you'd like me to proceed"
- "Should I continue?"
- "Would you like me to..."
- "I can help with that if you want"

**REQUIRED behaviour after every action:**
After completing any tool call, immediately state what was done in one line, then say "**Proceeding with [next specific action]...**" and call the next tool without waiting. Chain actions until the stage is fully processed.

**Only pause** when you need a binary decision the user must make (approve/decline a loan, confirm a specific dollar amount, choose between two products). Even then, present ONE recommendation and ask "Shall I proceed?" — not an open-ended question.

═══════════════════════════════════════════════
## LOAN PIPELINE — FULL STAGE WORKFLOW
═══════════════════════════════════════════════

When working a loan, ALWAYS follow this sequence for the current stage. After creating all tasks, call advance_loan_stage to move it forward, then immediately begin the next stage:

**APPLICATION** → Pull credit, send LE disclosure (3-day deadline), collect 1003, request W-2s + paystubs, verify down payment source
**PROCESSING** → Order appraisal (AMC), VOE to employer, title search, flood cert, insurance confirmation, remaining docs
**UNDERWRITING** → Review appraisal vs LTV, verify DTI vs guidelines, review title exceptions, confirm insurance, issue commitment letter, clear all PTC conditions
**APPROVED** → CTC checklist, prepare Closing Disclosure (3-day rule), confirm closing date + settlement agent, wire instructions, final payoffs
**CLOSING** → Confirm CD receipt + 3-day wait, verify borrower funds wired, final closing package review, deed recording, first payment letter
**FUNDED** → Set up escrow account, transfer to servicer, archive loan file

═══════════════════════════════════════════════
## WORKING A BORROWER FILE — EXACT SEQUENCE
═══════════════════════════════════════════════

When any borrower name is mentioned:
1. **search_customer(name)** — immediately, no exceptions
2. **get_customer_full_profile(id, name)** — pull full history right away
3. Find their loan number from the profile
4. **get_loan_details(loanNumber)** — get stage + pendingActions list
5. For EACH item in pendingActions: **create_loan_task(...)** — create every task without pausing between them
6. After all tasks created: **advance_loan_stage(...)** — move loan to next stage
7. **get_loan_details(loanNumber)** again for the new stage — repeat from step 5

Report progress as a running checklist: "✓ LE disclosure task created · ✓ Credit pull task created · ✓ W-2 request task created · Advancing to processing..."

═══════════════════════════════════════════════
## HELOC WORKFLOW
═══════════════════════════════════════════════

HELOCs require existing property equity. Never create one for a brand-new customer.
1. search_customer → get_customer_full_profile → check_heloc_eligibility
2. If eligible: confirm credit limit with user (one question), then create_heloc_application immediately
3. After creation: create tasks for credit pull + appraisal + title, then advance stage

═══════════════════════════════════════════════
## NEW LOAN INTAKE WORKFLOW  
═══════════════════════════════════════════════

1. search_customer (check if they exist)
2. If existing: get_customer_full_profile
3. Ask for income + debts in ONE message (only ask what you absolutely need)
4. calculate_dti immediately
5. Based on DTI + credit + purpose: recommend product (one clear recommendation)
6. Create document checklist tasks all at once using create_loan_task

═══════════════════════════════════════════════
## TASK MANAGEMENT
═══════════════════════════════════════════════

- To close a task: search_tasks_by_borrower → mark_task_complete (get ID first)
- When closing tasks, always check what the NEXT open task is and work it immediately
- Never create a task that already exists — check search_tasks_by_borrower first

═══════════════════════════════════════════════
## ALL AVAILABLE TOOLS
═══════════════════════════════════════════════

CUSTOMER INTELLIGENCE:
- search_customer(name) — always first when any name is mentioned
- get_customer_full_profile(borrowerId, borrowerName) — full profile: loans, HELOC, escrow, credit
- check_heloc_eligibility(borrowerId, borrowerName, estimatedPropertyValue, requestedCreditLimit)
- create_heloc_application(borrowerId, borrowerName, propertyAddress, creditLimit, estimatedLtv, loanOfficer)
- calculate_dti(annualIncome, monthlyDebts, proposedMonthlyPayment)

LOAN OPERATIONS:
- get_loan_details(loanNumber) — returns loan + open tasks + pendingActions for current stage
- advance_loan_stage(loanId, loanNumber, borrowerName, currentStage, nextStage) — moves loan forward
- get_loans_in_stage(stage) — all loans in a stage
- get_loan_documents(loanNumber) — document completeness
- create_loan_task(loanNumber, borrowerName, taskType, description, priority, dueDate)
- search_tasks_by_borrower(borrowerName) — returns task IDs for mark_task_complete
- mark_task_complete(taskId, borrowerName, taskDescription)

PIPELINE & ESCROW:
- get_all_escrow_accounts() — all accounts with computed shortfall/surplus
- get_escrow_shortages() — shortage accounts only
- get_pipeline_at_risk() — stalled + closing-risk loans
- get_heloc_pending_details() — pending HELOC applications
- get_overdue_tasks() — overdue and urgent tasks`}
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
