import { useRoute } from "wouter";
import { 
  useGetLoan, 
  useGetLoanNotes, 
  useGetLoanDocuments,
  useUpdateLoanStatus,
  useCreateLoanNote,
  useUpdateLoanDocument,
  getGetLoanQueryKey,
  getGetLoanNotesQueryKey,
  getGetLoanDocumentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopilotReadable, useCopilotAction } from "@copilotkit/react-core";
import { 
  CheckCircle2, 
  Clock, 
  FileText, 
  User, 
  Home, 
  DollarSign, 
  Percent, 
  Activity, 
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const STAGES = [
  'pre_qualification', 
  'pre_approval', 
  'application', 
  'processing', 
  'underwriting', 
  'approved', 
  'closing', 
  'funded'
];

export default function LoanDetail() {
  const [, params] = useRoute("/loans/:id");
  const loanId = params?.id ? parseInt(params.id) : 0;
  const queryClient = useQueryClient();

  const { data: loan, isLoading: isLoadingLoan } = useGetLoan(loanId, { 
    query: { enabled: !!loanId } 
  });
  
  const { data: notes, isLoading: isLoadingNotes } = useGetLoanNotes(loanId, { 
    query: { enabled: !!loanId } 
  });
  
  const { data: documents, isLoading: isLoadingDocs } = useGetLoanDocuments(loanId, { 
    query: { enabled: !!loanId } 
  });

  const updateStatusMutation = useUpdateLoanStatus();
  const createNoteMutation = useCreateLoanNote();
  const updateDocMutation = useUpdateLoanDocument();

  // CopilotKit Integration
  useCopilotReadable({
    description: "The current loan file details",
    value: loan || {},
  });

  useCopilotReadable({
    description: "The current documents and their status for this loan",
    value: documents || [],
  });

  useCopilotAction({
    name: "addLoanNote",
    description: "Add a note to the current loan file",
    parameters: [
      {
        name: "content",
        type: "string",
        description: "The content of the note",
        required: true,
      },
      {
        name: "noteType",
        type: "string",
        description: "Type of note (general, underwriting, processing, closing)",
        required: true,
      }
    ],
    handler: async ({ content, noteType }) => {
      await createNoteMutation.mutateAsync({
        id: loanId,
        data: {
          author: "Pursuit AI",
          content,
          noteType
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetLoanNotesQueryKey(loanId) });
      return "Note added successfully";
    },
  });

  useCopilotAction({
    name: "advanceLoanStage",
    description: "Advance the loan to the next stage in the pipeline",
    parameters: [
      {
        name: "nextStage",
        type: "string",
        description: "The exact string of the next stage (e.g. 'processing', 'underwriting')",
        required: true,
      }
    ],
    handler: async ({ nextStage }) => {
      await updateStatusMutation.mutateAsync({
        id: loanId,
        data: {
          status: "active",
          stage: nextStage
        }
      });
      queryClient.invalidateQueries({ queryKey: getGetLoanQueryKey(loanId) });
      return `Loan advanced to ${nextStage}`;
    },
  });

  if (isLoadingLoan) {
    return <div className="p-8 space-y-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!loan) return <div>Loan not found</div>;

  const currentStageIndex = STAGES.indexOf(loan.stage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">{loan.borrowerName}</h1>
            <Badge variant={loan.status === 'active' ? 'default' : 'secondary'} className="uppercase">
              {loan.status}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-sm">{loan.loanNumber}</span>
            <span>•</span>
            <span>{loan.propertyAddress}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{formatCurrency(loan.loanAmount)}</div>
          <div className="text-muted-foreground">
            {loan.loanType} • {loan.interestRate ? formatPercentage(loan.interestRate) : 'Rate TBD'}
          </div>
        </div>
      </div>

      {/* Stage Tracker */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-muted -translate-y-1/2 z-0" />
            <div 
              className="absolute left-0 top-1/2 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500" 
              style={{ width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%` }}
            />
            
            {STAGES.map((stage, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              
              return (
                <div key={stage} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isPast ? 'bg-primary border-primary text-primary-foreground' : 
                    isCurrent ? 'bg-background border-primary text-primary ring-4 ring-primary/20' : 
                    'bg-background border-muted text-muted-foreground'
                  }`}>
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-medium">{idx + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium capitalize absolute -bottom-6 whitespace-nowrap ${
                    isCurrent ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {stage.replace('_', ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full mt-8">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes & Activity</TabsTrigger>
          <TabsTrigger value="underwriting">Underwriting</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-muted-foreground" />
                  Borrower Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Primary Borrower</div>
                    <div className="font-medium">{loan.borrowerName}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Credit Score</div>
                    <div className="font-medium">{loan.creditScore || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">DTI</div>
                    <div className="font-medium">{loan.dti ? `${loan.dti}%` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Occupancy</div>
                    <div className="font-medium capitalize">{loan.occupancyType}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5 text-muted-foreground" />
                  Property & Loan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Purchase Price</div>
                    <div className="font-medium">{formatCurrency(loan.purchasePrice)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Down Payment</div>
                    <div className="font-medium">{formatCurrency(loan.downPayment)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">LTV</div>
                    <div className="font-medium">{loan.ltv ? `${loan.ltv}%` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Property Type</div>
                    <div className="font-medium capitalize">{loan.propertyType.replace('_', ' ')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Document Checklist
              </CardTitle>
              <Button size="sm" variant="outline">Request Docs</Button>
            </CardHeader>
            <CardContent>
              {isLoadingDocs ? (
                <div className="space-y-3"><Skeleton className="h-12 w-full"/><Skeleton className="h-12 w-full"/></div>
              ) : (
                <div className="space-y-4">
                  {documents?.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded bg-background border flex items-center justify-center ${doc.status === 'received' ? 'text-emerald-500 border-emerald-200' : 'text-muted-foreground'}`}>
                          {doc.status === 'received' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {doc.documentName}
                            {doc.required && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Required</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">{doc.documentType}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          doc.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                          doc.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {doc.status}
                        </span>
                        {doc.status !== 'received' && (
                          <Button size="sm" variant="ghost" onClick={() => {
                            updateDocMutation.mutate({
                              id: doc.id,
                              data: { status: 'received' }
                            }, {
                              onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetLoanDocumentsQueryKey(loanId) })
                            });
                          }}>
                            Mark Received
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                Notes & Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    JD
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input placeholder="Add a note..." />
                    <div className="flex justify-end">
                      <Button size="sm">Post Note</Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {isLoadingNotes ? (
                    <Skeleton className="h-20 w-full" />
                  ) : notes?.map(note => (
                    <div key={note.id} className="flex gap-4 p-4 border rounded-lg bg-muted/10">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">
                        {note.author.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{note.author}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{note.content}</p>
                        <Badge variant="outline" className="mt-2 text-[10px]">{note.noteType}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
