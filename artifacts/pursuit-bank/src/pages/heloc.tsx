import { useListHeloc } from "@workspace/api-client-react";
import { formatCurrency, formatDate, formatPercentage } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CreditCard, TrendingUp, Clock, DollarSign, Plus } from "lucide-react";

export default function Heloc() {
  const { data: accounts, isLoading } = useListHeloc();

  const totalLimit = accounts?.reduce((s, a) => s + a.creditLimit, 0) ?? 0;
  const totalDrawn = accounts?.reduce((s, a) => s + a.drawnAmount, 0) ?? 0;
  const totalAvailable = accounts?.reduce((s, a) => s + a.availableCredit, 0) ?? 0;
  const activeAccounts = accounts?.filter(a => a.status === "active") ?? [];
  const pendingAccounts = accounts?.filter(a => a.status === "pending") ?? [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HELOC Management</h1>
          <p className="text-muted-foreground">Home Equity Line of Credit applications and active accounts.</p>
        </div>
        <Link href="/new-loan">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            New HELOC Application
          </Button>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Credit Limit" value={formatCurrency(totalLimit)} icon={CreditCard} isLoading={isLoading} />
        <MetricCard label="Total Drawn" value={formatCurrency(totalDrawn)} icon={TrendingUp} sub={totalLimit > 0 ? `${Math.round((totalDrawn/totalLimit)*100)}% utilized` : undefined} isLoading={isLoading} />
        <MetricCard label="Available Credit" value={formatCurrency(totalAvailable)} icon={DollarSign} isLoading={isLoading} />
        <MetricCard label="Pending Review" value={String(pendingAccounts.length)} icon={Clock} alert={pendingAccounts.length > 0} isLoading={isLoading} />
      </div>

      {/* Pending Applications */}
      {pendingAccounts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Applications Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {pendingAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">{account.borrowerName}</div>
                    <div className="text-xs text-muted-foreground">{account.loanNumber} · {account.propertyAddress}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatCurrency(account.creditLimit)}</div>
                      <div className="text-xs text-muted-foreground">{formatPercentage(account.interestRate)} rate</div>
                    </div>
                    <StageBadge stage={account.stage} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Accounts */}
      {activeAccounts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-violet-500" />
              Active HELOC Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {activeAccounts.map(account => {
                const utilization = account.creditLimit > 0 ? (account.drawnAmount / account.creditLimit) * 100 : 0;
                const drawPeriodEnd = new Date(account.drawPeriodEnd);
                const daysUntilDraw = Math.ceil((drawPeriodEnd.getTime() - Date.now()) / 86400000);
                return (
                  <div key={account.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{account.borrowerName}</div>
                        <div className="text-sm text-muted-foreground">{account.loanNumber} · {account.propertyAddress}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{formatPercentage(account.interestRate)} prime+</div>
                        {account.nextPaymentDate && (
                          <div className="text-xs text-muted-foreground">Next pmt: {formatDate(account.nextPaymentDate)}</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(account.drawnAmount)} drawn</span>
                        <span>{formatCurrency(account.availableCredit)} available of {formatCurrency(account.creditLimit)}</span>
                      </div>
                      <Progress value={utilization} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className={`font-medium ${utilization > 80 ? 'text-amber-600' : 'text-muted-foreground'}`}>{Math.round(utilization)}% utilized</span>
                        <span className="text-muted-foreground">Draw period ends {daysUntilDraw > 0 ? `in ${daysUntilDraw}d` : 'soon'}</span>
                      </div>
                    </div>
                    {account.minimumPayment && (
                      <div className="text-xs text-muted-foreground">
                        Min payment: <span className="font-medium text-foreground">{formatCurrency(account.minimumPayment)}/mo</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All HELOC Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All HELOC Applications & Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Drawn</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Draw Period End</TableHead>
                  <TableHead>Officer</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts?.map(account => (
                  <TableRow key={account.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-muted-foreground">{account.loanNumber}</TableCell>
                    <TableCell className="font-medium text-sm">{account.borrowerName}</TableCell>
                    <TableCell className="font-semibold text-sm">{formatCurrency(account.creditLimit)}</TableCell>
                    <TableCell className="text-sm">{account.drawnAmount > 0 ? formatCurrency(account.drawnAmount) : "—"}</TableCell>
                    <TableCell className="text-sm text-emerald-700 font-medium">{formatCurrency(account.availableCredit)}</TableCell>
                    <TableCell className="text-sm">{formatPercentage(account.interestRate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(account.drawPeriodEnd)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{account.loanOfficer}</TableCell>
                    <TableCell><StageBadge stage={account.stage} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const styles: Record<string, string> = {
    application: "bg-indigo-50 text-indigo-700 border-indigo-200",
    processing: "bg-violet-50 text-violet-700 border-violet-200",
    underwriting: "bg-amber-50 text-amber-700 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    funded: "bg-slate-800 text-slate-100 border-slate-700",
    closing: "bg-teal-50 text-teal-700 border-teal-200",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize whitespace-nowrap ${styles[stage] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
      {stage}
    </Badge>
  );
}

function MetricCard({ label, value, sub, icon: Icon, alert, isLoading }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>;
  alert?: boolean; isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <Icon className={`w-4 h-4 ${alert ? "text-amber-500" : "text-muted-foreground"}`} />
        </div>
        {isLoading ? <Skeleton className="h-7 w-28 mb-1" /> : (
          <div className={`text-2xl font-bold ${alert ? "text-amber-600" : ""}`}>{value}</div>
        )}
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
