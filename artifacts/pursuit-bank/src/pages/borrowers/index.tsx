import { useListBorrowers } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Filter, Users, Mail, Phone } from "lucide-react";
import { useState } from "react";

export default function BorrowersList() {
  const [search, setSearch] = useState("");
  const { data: borrowers, isLoading } = useListBorrowers(search ? { search } : undefined);

  const getSourceColor = (source: string) => {
    switch(source.toLowerCase()) {
      case 'salesforce': return 'bg-[#00A1E0]/10 text-[#00A1E0] border-[#00A1E0]/20';
      case 'hubspot': return 'bg-[#FF7A59]/10 text-[#FF7A59] border-[#FF7A59]/20';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Borrower CRM</h1>
          <p className="text-muted-foreground">Manage leads, prospects, and past clients.</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Borrower
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
        <div className="flex items-center flex-1 max-w-sm relative">
          <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or phone" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              <TableHead>Borrower</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Financial Profile</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : borrowers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 mb-2 text-muted-foreground/50" />
                    No borrowers found matching your criteria.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              borrowers?.map((borrower) => (
                <TableRow key={borrower.id} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                  <TableCell>
                    <Link href={`/borrowers/${borrower.id}`} className="block">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                          {borrower.firstName[0]}{borrower.lastName[0]}
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">
                            {borrower.firstName} {borrower.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {borrower.employmentStatus.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {borrower.email}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {borrower.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{formatCurrency(borrower.annualIncome)} / yr</span>
                      <span className="text-xs text-muted-foreground">
                        Credit: <span className={borrower.creditScore && borrower.creditScore > 700 ? 'text-emerald-600 font-medium' : ''}>{borrower.creditScore || 'N/A'}</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${getSourceColor(borrower.crmSource)} capitalize`}>
                      {borrower.crmSource}
                    </Badge>
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
