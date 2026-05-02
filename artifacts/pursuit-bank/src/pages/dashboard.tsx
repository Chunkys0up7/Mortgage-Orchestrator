import { useGetPipelineSummary, useGetPipelineActivity } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Clock, CheckCircle2, TrendingUp, Activity, FileText } from "lucide-react";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetPipelineSummary();
  const { data: activity, isLoading: isLoadingActivity } = useGetPipelineActivity({ limit: 10 });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Pipeline overview and recent activity.</p>
      </div>

      {/* Metrics Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Volume" 
          value={summary ? formatCurrency(summary.totalVolume) : null} 
          icon={TrendingUp}
          trend="+12% from last month"
          isLoading={isLoadingSummary}
        />
        <MetricCard 
          title="Active Loans" 
          value={summary?.totalLoans} 
          icon={FileText}
          isLoading={isLoadingSummary}
        />
        <MetricCard 
          title="Closing This Month" 
          value={summary?.closingThisMonth} 
          icon={CheckCircle2}
          isLoading={isLoadingSummary}
        />
        <MetricCard 
          title="Pending Docs" 
          value={summary?.pendingDocuments} 
          icon={Clock}
          alert={summary && summary.pendingDocuments > 10}
          isLoading={isLoadingSummary}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by Stage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pipeline by Stage</CardTitle>
            <CardDescription>Current distribution of active loans</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {summary?.byStage.map((stage) => {
                  const percentage = (stage.count / summary.totalLoans) * 100;
                  return (
                    <div key={stage.stage} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium capitalize truncate" title={stage.stage.replace('_', ' ')}>
                        {stage.stage.replace('_', ' ')}
                      </div>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-right text-sm font-medium">
                        {stage.count}
                      </div>
                      <div className="w-24 text-right text-sm text-muted-foreground">
                        {formatCurrency(stage.volume)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {activity?.map((item) => (
                  <div key={item.id} className="relative flex items-start gap-4">
                    <div className="absolute left-0 mt-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex-1 pl-6">
                      <div className="text-sm font-medium">{item.action}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.loanNumber}</span>
                        <span>•</span>
                        <span>{item.borrowerName}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  alert, 
  isLoading 
}: { 
  title: string; 
  value: React.ReactNode; 
  icon: any; 
  trend?: string; 
  alert?: boolean;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className={`w-4 h-4 ${alert ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </div>
        <div className="flex items-center justify-between mt-4">
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
          {alert && (
            <div className="flex items-center gap-1 text-amber-500 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              Action Req
            </div>
          )}
        </div>
        {trend && !isLoading && (
          <p className="text-xs text-muted-foreground mt-2">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
