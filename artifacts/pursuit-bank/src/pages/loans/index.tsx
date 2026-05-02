import { useListLoans } from "@workspace/api-client-react";
import { formatCurrency, formatPercentage } from "@/lib/format";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Filter } from "lucide-react";
import { useState } from "react";

export default function LoansList() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data, isLoading } = useListLoans(statusFilter ? { status: statusFilter } : undefined);

  const getStageColor = (stage: string) => {
    switch(stage) {
      case 'pre_qualification': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'pre_approval': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'application': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'processing': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'underwriting': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'closing': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'funded': return 'bg-slate-800 text-slate-100 border-slate-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan Pipeline</h1>
          <p className="text-muted-foreground">Manage and track all active applications.</p>
        </div>
        <Link href="/new-loan">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Application
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
        <div className="flex items-center flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input 
            placeholder="Search by name, address, or loan #" 
            className="pl-9 bg-transparent border-transparent focus-visible:ring-0 shadow-none"
          />
        </div>
        <div className="h-6 w-px bg-border"></div>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Loan Number</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Amount / Rate</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Officer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : data?.loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No loans found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              data?.loans.map((loan) => (
                <TableRow key={loan.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <TableCell className="font-medium text-muted-foreground">
                    <Link href={`/pipeline/${loan.id}`} className="hover:text-primary transition-colors block">
                      {loan.loanNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/pipeline/${loan.id}`} className="block">
                      <div className="font-medium group-hover:text-primary transition-colors">{loan.borrowerName}</div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm truncate max-w-[200px]" title={loan.propertyAddress}>
                      {loan.propertyAddress}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{formatCurrency(loan.loanAmount)}</span>
                      <span className="text-xs text-muted-foreground">
                        {loan.interestRate ? formatPercentage(loan.interestRate) : 'TBD'} • {loan.loanType}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getStageColor(loan.stage)} capitalize whitespace-nowrap`}>
                      {loan.stage.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{loan.loanOfficer}</div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
