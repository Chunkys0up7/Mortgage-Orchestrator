import { useRoute } from "wouter";
import { useGetBorrower } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, MapPin, Briefcase, DollarSign, Calendar, CreditCard } from "lucide-react";

export default function BorrowerDetail() {
  const [, params] = useRoute("/borrowers/:id");
  const borrowerId = params?.id ? parseInt(params.id) : 0;

  const { data: borrower, isLoading } = useGetBorrower(borrowerId, { 
    query: { enabled: !!borrowerId } 
  });

  if (isLoading) {
    return <div className="p-8 space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!borrower) return <div>Borrower not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
            {borrower.firstName[0]}{borrower.lastName[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{borrower.firstName} {borrower.lastName}</h1>
            <p className="text-muted-foreground flex items-center gap-2 mt-1 text-sm">
              <Badge variant="secondary" className="capitalize">{borrower.crmSource}</Badge>
              <span>Added {formatDate(borrower.createdAt)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Financial Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-md"><DollarSign className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Annual Income</div>
                  <div className="font-semibold text-lg">{formatCurrency(borrower.annualIncome)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-md"><CreditCard className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Credit Score</div>
                  <div className="font-semibold text-lg">{borrower.creditScore || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-md"><Briefcase className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">Employment</div>
                  <div className="font-medium capitalize">{borrower.employmentStatus.replace('_', ' ')}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-md"><Calendar className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <div className="text-sm text-muted-foreground">DOB</div>
                  <div className="font-medium">{formatDate(borrower.dateOfBirth)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${borrower.email}`} className="text-primary hover:underline">{borrower.email}</a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{borrower.phone}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span>{borrower.currentAddress || 'No address provided'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
