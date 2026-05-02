import { useState } from "react";
import { useListTasks, useUpdateTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, Clock, Filter } from "lucide-react";

type StatusFilter = "open" | "in_progress" | "completed" | "all";

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const params = statusFilter === "all" ? {} : { status: statusFilter };
  const { data: tasks, isLoading } = useListTasks(params);
  const { mutateAsync: updateTask } = useUpdateTask();

  const handleComplete = async (id: number) => {
    await updateTask({ id, data: { status: "completed" } });
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
    toast({ title: "Task completed" });
  };

  const handleStart = async (id: number) => {
    await updateTask({ id, data: { status: "in_progress" } });
    await queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
  };

  const urgentCount = tasks?.filter(t => t.priority === "urgent" && t.status !== "completed").length ?? 0;
  const openCount = tasks?.filter(t => t.status === "open").length ?? 0;
  const inProgressCount = tasks?.filter(t => t.status === "in_progress").length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Task Queue</h1>
          <p className="text-muted-foreground">All operational tasks across the loan pipeline.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {urgentCount > 0 && (
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
              <AlertCircle className="w-3 h-3" />
              {urgentCount} urgent
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            {openCount} open · {inProgressCount} in progress
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {(["open", "in_progress", "completed", "all"] as StatusFilter[]).map(f => (
          <Button
            key={f}
            variant={statusFilter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(f)}
            className="capitalize"
          >
            {f === "all" ? "All Tasks" : f.replace("_", " ")}
          </Button>
        ))}
      </div>

      {/* Task List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {statusFilter === "all" ? "All Tasks" : `${statusFilter.replace("_", " ")} Tasks`}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium">No {statusFilter !== "all" ? statusFilter.replace("_", " ") : ""} tasks</p>
              <p className="text-sm mt-1">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks?.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={() => handleComplete(task.id)}
                  onStart={() => handleStart(task.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskCard({ task, onComplete, onStart }: {
  task: {
    id: number; loanNumber: string; borrowerName: string; taskType: string;
    description: string; priority: string; status: string;
    dueDate?: string | null; assignedTo?: string | null;
  };
  onComplete: () => void;
  onStart: () => void;
}) {
  const isUrgent = task.priority === "urgent";
  const isHigh = task.priority === "high";
  const isCompleted = task.status === "completed";
  const isInProgress = task.status === "in_progress";

  const priorityStyles: Record<string, string> = {
    urgent: "border-l-4 border-l-red-500 bg-red-50/50",
    high: "border-l-4 border-l-amber-500 bg-amber-50/50",
    normal: "border-l-4 border-l-blue-400 bg-blue-50/20",
    low: "border-l-4 border-l-gray-300",
  };

  return (
    <div className={`p-4 rounded-lg border ${priorityStyles[task.priority] ?? ""} ${isCompleted ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <PriorityBadge priority={task.priority} />
            <TaskTypeBadge type={task.taskType} />
            <StatusBadge status={task.status} />
          </div>
          <p className={`text-sm font-medium ${isCompleted ? "line-through" : ""}`}>{task.description}</p>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span className="font-mono font-medium text-foreground/70">{task.loanNumber}</span>
            <span>{task.borrowerName}</span>
            {task.dueDate && (
              <span className={`${new Date(task.dueDate) < new Date() && !isCompleted ? 'text-red-600 font-medium' : ''}`}>
                Due {formatDate(task.dueDate)}
              </span>
            )}
            {task.assignedTo && <span>→ {task.assignedTo}</span>}
          </div>
        </div>
        {!isCompleted && (
          <div className="flex items-center gap-2 shrink-0">
            {task.status === "open" && (
              <Button variant="outline" size="sm" onClick={onStart} className="text-xs h-7">
                Start
              </Button>
            )}
            <Button size="sm" onClick={onComplete} className="text-xs h-7 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Complete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    urgent: "bg-red-50 text-red-700 border-red-200",
    high: "bg-amber-50 text-amber-700 border-amber-200",
    normal: "bg-blue-50 text-blue-700 border-blue-200",
    low: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return <Badge variant="outline" className={`text-xs capitalize ${styles[priority] ?? ""}`}>{priority}</Badge>;
}

function TaskTypeBadge({ type }: { type: string }) {
  const label = type.replace("_", " ");
  return <Badge variant="secondary" className="text-xs capitalize">{label}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-slate-50 text-slate-600 border-slate-200",
    in_progress: "bg-violet-50 text-violet-700 border-violet-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    waived: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return <Badge variant="outline" className={`text-xs capitalize ${styles[status] ?? ""}`}>{status.replace("_", " ")}</Badge>;
}
