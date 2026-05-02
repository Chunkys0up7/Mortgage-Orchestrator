import { useGetPipelineSummary, useGetPipelineActivity, useListTasks, useListEscrow, useListHeloc } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  AlertTriangle, Clock, CheckCircle2, TrendingUp, 
  FileText, ClipboardList, Building2, CreditCard,
  ChevronRight, ArrowRight, CalendarClock, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetPipelineSummary();
  const { data: tasks, isLoading: isTasksLoading } = useListTasks({ status: "open" });
  const { data: escrowAccounts, isLoading: isEscrowLoading } = useListEscrow();
  const { data: helocAccounts, isLoading: isHelocLoading } = useListHeloc();
  const { data: activity } = useGetPipelineActivity({ limit: 6 });

  const urgentTasks = tasks?.filter(t => t.priority === "urgent") ?? [];
  const highTasks = tasks?.filter(t => t.priority === "high") ?? [];
  const upcomingDisbursements = escrowAccounts
    ?.filter(e => e.nextDisbursementDate)
    .sort((a, b) => (a.nextDisbursementDate ?? "").localeCompare(b.nextDisbursementDate ?? ""))
    .slice(0, 4) ?? [];
  const shortageAccounts = escrowAccounts?.filter(e => e.status === "shortage") ?? [];
  const helocPending = helocAccounts?.filter(h => h.status === "pending") ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operations Center</h1>
          <p className="text-muted-foreground">Your daily task queue, escrow, and pipeline status.</p>
        </div>
        <Link href="/new-loan">
          <Button className="gap-2">
            <FileText className="w-4 h-4" />
            New Loan Application
          </Button>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <OpsMetricCard
          label="Open Tasks"
          value={isSummaryLoading ? null : summary?.openTasks}
          sub={`${urgentTasks.length} urgent`}
          icon={ClipboardList}
          alertLevel={urgentTasks.length > 0 ? "urgent" : undefined}
          href="/tasks"
          isLoading={isSummaryLoading}
        />
        <OpsMetricCard
          label="Loans in Pipeline"
          value={isSummaryLoading ? null : summary?.totalLoans}
          sub={`${summary?.closingThisMonth ?? 0} closing soon`}
          icon={FileText}
          href="/pipeline"
          isLoading={isSummaryLoading}
        />
        <OpsMetricCard
          label="Escrow Accounts"
          value={isSummaryLoading ? null : escrowAccounts?.length}
          sub={`${shortageAccounts.length} shortage${shortageAccounts.length !== 1 ? "s" : ""}`}
          icon={Building2}
          alertLevel={shortageAccounts.length > 0 ? "warn" : undefined}
          href="/escrow"
          isLoading={isEscrowLoading}
        />
        <OpsMetricCard
          label="HELOC Accounts"
          value={isHelocLoading ? null : helocAccounts?.length}
          sub={`${helocPending.length} pending review`}
          icon={CreditCard}
          href="/heloc"
          isLoading={isHelocLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Urgent Tasks */}
        <div className="lg:col-span-2 space-y-4">
          {/* Urgent Tasks */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Urgent Tasks
                </CardTitle>
                <CardDescription>Require immediate attention today</CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  All tasks <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {isTasksLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : urgentTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-medium">No urgent tasks — you're on top of it!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {urgentTasks.slice(0, 4).map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                  {highTasks.slice(0, 2).map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Escrow Disbursements */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="w-4 h-4 text-blue-500" />
                  Upcoming Escrow Disbursements
                </CardTitle>
                <CardDescription>Next property tax & insurance payments</CardDescription>
              </div>
              <Link href="/escrow">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  All escrow <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {isEscrowLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : upcomingDisbursements.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming disbursements</p>
              ) : (
                <div className="divide-y">
                  {upcomingDisbursements.map(account => {
                    const daysUntil = account.nextDisbursementDate
                      ? Math.ceil((new Date(account.nextDisbursementDate).getTime() - Date.now()) / 86400000)
                      : null;
                    const isOverdue = daysUntil !== null && daysUntil < 0;
                    const isUrgent = daysUntil !== null && daysUntil <= 3;
                    return (
                      <div key={account.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{account.borrowerName}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {account.nextDisbursementType?.replace("_", " ")} • {account.loanNumber}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold">{formatCurrency(account.nextDisbursementAmount)}</div>
                          <div className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {isOverdue ? `${Math.abs(daysUntil!)} days overdue` : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`}
                          </div>
                        </div>
                        {(account.status === "shortage") && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 shrink-0">Shortage</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Pipeline + Activity */}
        <div className="space-y-4">
          {/* Pipeline Stage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Pipeline by Stage
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isSummaryLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-7 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {summary?.byStage.map(s => {
                    const pct = summary.totalLoans > 0 ? (s.count / summary.totalLoans) * 100 : 0;
                    const label = s.stage.replace(/_/g, " ");
                    return (
                      <div key={s.stage} className="flex items-center gap-2">
                        <div className="w-28 text-xs font-medium capitalize truncate text-muted-foreground">{label}</div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-5 text-right text-xs font-semibold">{s.count}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 pt-3 border-t flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total volume</span>
                <span className="text-sm font-bold">{isSummaryLoading ? "—" : formatCurrency(summary?.totalVolume)}</span>
              </div>
            </CardContent>
          </Card>

          {/* HELOC Summary */}
          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-violet-500" />
                HELOC Pipeline
              </CardTitle>
              <Link href="/heloc">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-7 text-xs">
                  View all <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-0">
              {isHelocLoading ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {helocAccounts?.slice(0, 4).map(h => (
                    <div key={h.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{h.borrowerName}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(h.creditLimit)} limit</div>
                      </div>
                      <HelocStageBadge stage={h.stage} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {activity?.slice(0, 5).map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <div>
                      <div className="text-xs font-medium leading-tight">{item.action}</div>
                      <div className="text-xs text-muted-foreground">{item.loanNumber} · {item.borrowerName}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: { id: number; borrowerName: string; loanNumber: string; taskType: string; description: string; dueDate?: string | null; priority: string; assignedTo?: string | null } }) {
  const isUrgent = task.priority === "urgent";
  const isHigh = task.priority === "high";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isUrgent ? 'bg-red-50 border-red-100' : isHigh ? 'bg-amber-50 border-amber-100' : 'bg-muted/30 border-border'}`}>
      <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${isUrgent ? 'bg-red-500' : isHigh ? 'bg-amber-500' : 'bg-slate-400'}`} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight truncate">{task.description}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {task.loanNumber} · {task.borrowerName}
          {task.dueDate && ` · Due ${formatDate(task.dueDate)}`}
        </div>
      </div>
      {task.priority === "urgent" && (
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      )}
    </div>
  );
}

function HelocStageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    application: "bg-indigo-50 text-indigo-700 border-indigo-200",
    processing: "bg-violet-50 text-violet-700 border-violet-200",
    underwriting: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    funded: "bg-slate-800 text-slate-100 border-slate-700",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize whitespace-nowrap ${styles[stage] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {stage}
    </Badge>
  );
}

function OpsMetricCard({ label, value, sub, icon: Icon, alertLevel, href, isLoading }: {
  label: string; value: number | null | undefined; sub?: string; icon: React.ComponentType<{ className?: string }>;
  alertLevel?: "urgent" | "warn"; href: string; isLoading?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground font-medium">{label}</span>
            <Icon className={`w-4 h-4 ${alertLevel === "urgent" ? "text-red-500" : alertLevel === "warn" ? "text-amber-500" : "text-muted-foreground"} group-hover:scale-110 transition-transform`} />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <div className={`text-3xl font-bold ${alertLevel === "urgent" ? "text-red-600" : alertLevel === "warn" ? "text-amber-600" : ""}`}>
              {value ?? 0}
            </div>
          )}
          {sub && <div className={`text-xs mt-1 font-medium ${alertLevel === "urgent" ? "text-red-500" : alertLevel === "warn" ? "text-amber-500" : "text-muted-foreground"}`}>{sub}</div>}
        </CardContent>
      </Card>
    </Link>
  );
}
