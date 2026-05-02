import { useListEscrow } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, AlertTriangle, CalendarClock, TrendingUp, DollarSign } from "lucide-react";

export default function Escrow() {
  const { data: accounts, isLoading } = useListEscrow();

  const totalBalance = accounts?.reduce((s, a) => s + a.balance, 0) ?? 0;
  const shortages = accounts?.filter(a => a.status === "shortage") ?? [];
  const upcoming = accounts
    ?.filter(a => a.nextDisbursementDate)
    .sort((a, b) => (a.nextDisbursementDate ?? "").localeCompare(b.nextDisbursementDate ?? ""))
    ?? [];
  const totalMonthlyCollection = accounts?.reduce((s, a) => s + a.monthlyEscrowPayment, 0) ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escrow Management</h1>
        <p className="text-muted-foreground">Track escrow balances, disbursements, and shortage accounts.</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Escrow Balance"
          value={isLoading ? null : formatCurrency(totalBalance)}
          icon={DollarSign}
          isLoading={isLoading}
        />
        <MetricCard
          label="Monthly Collection"
          value={isLoading ? null : formatCurrency(totalMonthlyCollection)}
          icon={TrendingUp}
          sub="across all accounts"
          isLoading={isLoading}
        />
        <MetricCard
          label="Upcoming Disbursements"
          value={isLoading ? null : String(upcoming.length)}
          icon={CalendarClock}
          sub="scheduled"
          isLoading={isLoading}
        />
        <MetricCard
          label="Shortage Accounts"
          value={isLoading ? null : String(shortages.length)}
          icon={AlertTriangle}
          alert={shortages.length > 0}
          isLoading={isLoading}
        />
      </div>

      {/* Shortage Alert */}
      {shortages.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-red-800 text-sm">
              {shortages.length} escrow account{shortages.length > 1 ? "s" : ""} in shortage
            </div>
            <div className="text-sm text-red-700 mt-0.5">
              {shortages.map(s => s.borrowerName).join(", ")} — escrow analysis and borrower notification required.
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Disbursements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-blue-500" />
            Upcoming Disbursements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming disbursements scheduled.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Loan Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.map(account => {
                  const daysUntil = account.nextDisbursementDate
                    ? Math.ceil((new Date(account.nextDisbursementDate).getTime() - Date.now()) / 86400000)
                    : null;
                  const isOverdue = daysUntil !== null && daysUntil < 0;
                  const isUrgent = daysUntil !== null && daysUntil <= 3;
                  return (
                    <TableRow key={account.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{account.borrowerName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">{account.loanNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">
                          {account.nextDisbursementType?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(account.nextDisbursementAmount)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(account.nextDisbursementDate)}</span>
                          <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {isOverdue ? `${Math.abs(daysUntil!)}d overdue` : daysUntil === 0 ? 'Today' : `In ${daysUntil}d`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium text-sm ${account.balance < (account.nextDisbursementAmount ?? 0) ? 'text-red-600' : ''}`}>
                          {formatCurrency(account.balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={account.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* All Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            All Escrow Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Monthly Escrow</TableHead>
                  <TableHead>Property Tax/yr</TableHead>
                  <TableHead>Insurance/yr</TableHead>
                  <TableHead>HOA/yr</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Last Analysis</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts?.map(account => (
                  <TableRow key={account.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium">{account.borrowerName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{account.loanNumber}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate" title={account.propertyAddress}>
                      {account.propertyAddress}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{formatCurrency(account.monthlyEscrowPayment)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(account.propertyTaxAnnual)}</TableCell>
                    <TableCell className="text-sm">{formatCurrency(account.insuranceAnnual)}</TableCell>
                    <TableCell className="text-sm">{account.hoaAnnual > 0 ? formatCurrency(account.hoaAnnual) : "—"}</TableCell>
                    <TableCell>
                      <span className={`font-medium text-sm ${account.status === "shortage" ? "text-red-600" : ""}`}>
                        {formatCurrency(account.balance)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.lastAnalysisDate ? formatDate(account.lastAnalysisDate) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={account.status} /></TableCell>
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    shortage: "bg-red-50 text-red-700 border-red-200",
    surplus: "bg-blue-50 text-blue-700 border-blue-200",
    suspended: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <Badge variant="outline" className={`text-xs capitalize ${styles[status] ?? ""}`}>{status}</Badge>
  );
}

function MetricCard({ label, value, sub, icon: Icon, alert, isLoading }: {
  label: string; value: string | null; sub?: string; icon: React.ComponentType<{ className?: string }>;
  alert?: boolean; isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <Icon className={`w-4 h-4 ${alert ? "text-red-500" : "text-muted-foreground"}`} />
        </div>
        {isLoading ? <Skeleton className="h-7 w-20 mb-1" /> : (
          <div className={`text-2xl font-bold ${alert ? "text-red-600" : ""}`}>{value ?? "—"}</div>
        )}
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}
