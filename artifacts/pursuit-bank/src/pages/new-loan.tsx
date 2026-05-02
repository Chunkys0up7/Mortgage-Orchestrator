import { useState } from "react";
import { useListBorrowers, useCreateBorrower, useCreateLoan, useListProducts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { ChevronLeft, ChevronRight, CheckCircle2, User, Home, DollarSign, FileText } from "lucide-react";

const STEPS = [
  { id: 1, label: "Borrower", icon: User },
  { id: 2, label: "Property", icon: Home },
  { id: 3, label: "Loan", icon: DollarSign },
  { id: 4, label: "Review", icon: FileText },
];

type FormData = {
  borrowerMode: "existing" | "new";
  borrowerId: number | null;
  firstName: string; lastName: string; email: string; phone: string;
  employmentStatus: string; annualIncome: string; creditScore: string;
  propertyAddress: string; propertyType: string; occupancyType: string;
  purchasePrice: string;
  loanAmount: string; loanType: string; loanPurpose: string;
  downPayment: string; productId: string;
  loanOfficer: string; processor: string;
};

const INIT: FormData = {
  borrowerMode: "existing", borrowerId: null,
  firstName: "", lastName: "", email: "", phone: "",
  employmentStatus: "employed", annualIncome: "", creditScore: "",
  propertyAddress: "", propertyType: "single_family", occupancyType: "primary",
  purchasePrice: "",
  loanAmount: "", loanType: "conventional", loanPurpose: "purchase",
  downPayment: "", productId: "",
  loanOfficer: "Jennifer Walsh", processor: "",
};

export default function NewLoan() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INIT);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: borrowers } = useListBorrowers();
  const { data: products } = useListProducts();
  const { mutateAsync: createBorrower, isPending: creatingBorrower } = useCreateBorrower();
  const { mutateAsync: createLoan, isPending: creatingLoan } = useCreateLoan();

  const set = (field: keyof FormData, value: string | number | null) =>
    setForm(f => ({ ...f, [field]: value }));

  const selectedBorrower = borrowers?.find(b => b.id === form.borrowerId);
  const selectedProduct = products?.find(p => p.id === Number(form.productId));
  const ltv = form.purchasePrice && form.loanAmount
    ? Math.round((Number(form.loanAmount) / Number(form.purchasePrice)) * 100 * 10) / 10
    : null;

  const handleSubmit = async () => {
    try {
      let borrowerId = form.borrowerId;
      if (form.borrowerMode === "new") {
        const b = await createBorrower({
          firstName: form.firstName, lastName: form.lastName,
          email: form.email, phone: form.phone,
          employmentStatus: form.employmentStatus,
          annualIncome: form.annualIncome ? Number(form.annualIncome) : null,
          creditScore: form.creditScore ? Number(form.creditScore) : null,
          crmSource: "manual",
        });
        borrowerId = b.id;
      }
      if (!borrowerId) throw new Error("Borrower required");
      const loan = await createLoan({
        borrowerId,
        propertyAddress: form.propertyAddress,
        loanAmount: Number(form.loanAmount),
        loanType: form.loanType,
        loanPurpose: form.loanPurpose,
        propertyType: form.propertyType,
        occupancyType: form.occupancyType,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        downPayment: form.downPayment ? Number(form.downPayment) : null,
        loanOfficer: form.loanOfficer,
        productId: form.productId ? Number(form.productId) : null,
        creditScore: form.creditScore ? Number(form.creditScore) : null,
        ltv,
      });
      await queryClient.invalidateQueries();
      toast({ title: "Loan created", description: `${loan.loanNumber} created successfully.` });
      navigate(`/pipeline/${loan.id}`);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to create loan", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Loan Application</h1>
        <p className="text-muted-foreground">Complete all steps to originate a new loan.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => step > s.id && setStep(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                step === s.id ? 'bg-primary text-primary-foreground' :
                step > s.id ? 'text-primary cursor-pointer hover:bg-primary/10' :
                'text-muted-foreground cursor-not-allowed'
              }`}
            >
              {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${step > s.id ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Borrower */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Borrower Information</CardTitle>
            <CardDescription>Select an existing borrower or create a new record.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-3">
              {(["existing", "new"] as const).map(m => (
                <Button key={m} variant={form.borrowerMode === m ? "default" : "outline"} onClick={() => set("borrowerMode", m)}>
                  {m === "existing" ? "Existing Borrower" : "New Borrower"}
                </Button>
              ))}
            </div>

            {form.borrowerMode === "existing" ? (
              <div className="space-y-2">
                <Label>Select Borrower</Label>
                <Select value={form.borrowerId?.toString() ?? ""} onValueChange={v => set("borrowerId", Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select a borrower..." />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowers?.map(b => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        {b.firstName} {b.lastName} — {b.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBorrower && (
                  <div className="mt-3 p-4 bg-muted/50 rounded-lg grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Email:</span> {selectedBorrower.email}</div>
                    <div><span className="text-muted-foreground">Phone:</span> {selectedBorrower.phone}</div>
                    <div><span className="text-muted-foreground">Credit Score:</span> {selectedBorrower.creditScore ?? "N/A"}</div>
                    <div><span className="text-muted-foreground">Income:</span> {selectedBorrower.annualIncome ? formatCurrency(selectedBorrower.annualIncome) : "N/A"}</div>
                    <div><span className="text-muted-foreground">Employment:</span> {selectedBorrower.employmentStatus}</div>
                    <div><span className="text-muted-foreground">Source:</span> {selectedBorrower.crmSource}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" value={form.firstName} onChange={v => set("firstName", v)} required />
                <FormField label="Last Name" value={form.lastName} onChange={v => set("lastName", v)} required />
                <FormField label="Email" value={form.email} onChange={v => set("email", v)} type="email" required />
                <FormField label="Phone" value={form.phone} onChange={v => set("phone", v)} required />
                <FormField label="Annual Income" value={form.annualIncome} onChange={v => set("annualIncome", v)} type="number" prefix="$" />
                <FormField label="Credit Score" value={form.creditScore} onChange={v => set("creditScore", v)} type="number" />
                <div className="space-y-2">
                  <Label>Employment Status</Label>
                  <Select value={form.employmentStatus} onValueChange={v => set("employmentStatus", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["employed", "self_employed", "retired", "unemployed"].map(s => (
                        <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Property */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>Enter the subject property information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Property Address" value={form.propertyAddress} onChange={v => set("propertyAddress", v)} required className="col-span-2" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Property Type</Label>
                <Select value={form.propertyType} onValueChange={v => set("propertyType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["single_family","Single Family"],["multi_family","Multi Family"],["condo","Condo"],["townhouse","Townhouse"],["manufactured","Manufactured"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Occupancy</Label>
                <Select value={form.occupancyType} onValueChange={v => set("occupancyType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["primary","Primary Residence"],["secondary","Secondary Home"],["investment","Investment Property"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loan Purpose</Label>
                <Select value={form.loanPurpose} onValueChange={v => set("loanPurpose", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[["purchase","Purchase"],["refinance","Refinance"],["cash_out_refinance","Cash-Out Refinance"],["heloc","HELOC"]].map(([v,l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormField label="Purchase Price / Appraised Value" value={form.purchasePrice} onChange={v => set("purchasePrice", v)} type="number" prefix="$" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Loan Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
            <CardDescription>Enter loan amount, type, and assign team members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Loan Amount" value={form.loanAmount} onChange={v => set("loanAmount", v)} type="number" prefix="$" required />
              <FormField label="Down Payment" value={form.downPayment} onChange={v => set("downPayment", v)} type="number" prefix="$" />
              <div className="space-y-2">
                <Label>Loan Type</Label>
                <Select value={form.loanType} onValueChange={v => set("loanType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["conventional","fha","va","usda","jumbo","heloc"].map(t => (
                      <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={form.productId} onValueChange={v => set("productId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select product..." /></SelectTrigger>
                  <SelectContent>
                    {products?.filter(p => p.isActive).map(p => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FormField label="Loan Officer" value={form.loanOfficer} onChange={v => set("loanOfficer", v)} required />
              <FormField label="Processor (optional)" value={form.processor} onChange={v => set("processor", v)} />
            </div>
            {ltv && (
              <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${ltv > 95 ? 'bg-red-50 border-red-200' : ltv > 80 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <span className="font-medium">Calculated LTV:</span>
                <span className={`font-bold ${ltv > 95 ? 'text-red-700' : ltv > 80 ? 'text-amber-700' : 'text-emerald-700'}`}>{ltv}%</span>
                {ltv > 80 && <span className="text-muted-foreground text-xs">· PMI may be required</span>}
                {selectedProduct && ltv > Number(selectedProduct.maxLtv) && (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 ml-auto text-xs">Exceeds product max LTV {selectedProduct.maxLtv}%</Badge>
                )}
              </div>
            )}
            {selectedProduct && (
              <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-1">
                <div className="font-medium text-foreground">{selectedProduct.name}</div>
                <div className="text-muted-foreground">Min credit: {selectedProduct.minCreditScore} · Max LTV: {selectedProduct.maxLtv}% · Max DTI: {selectedProduct.maxDti}%</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Submit</CardTitle>
            <CardDescription>Confirm all details before creating the loan application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ReviewSection title="Borrower">
              {form.borrowerMode === "existing" && selectedBorrower ? (
                <>
                  <ReviewRow label="Name" value={`${selectedBorrower.firstName} ${selectedBorrower.lastName}`} />
                  <ReviewRow label="Email" value={selectedBorrower.email} />
                  <ReviewRow label="Credit Score" value={selectedBorrower.creditScore?.toString() ?? "N/A"} />
                </>
              ) : (
                <>
                  <ReviewRow label="Name" value={`${form.firstName} ${form.lastName}`} />
                  <ReviewRow label="Email" value={form.email} />
                  <ReviewRow label="Credit Score" value={form.creditScore || "N/A"} />
                  <ReviewRow label="Annual Income" value={form.annualIncome ? formatCurrency(Number(form.annualIncome)) : "N/A"} />
                </>
              )}
            </ReviewSection>
            <ReviewSection title="Property">
              <ReviewRow label="Address" value={form.propertyAddress} />
              <ReviewRow label="Type" value={form.propertyType.replace("_", " ")} />
              <ReviewRow label="Occupancy" value={form.occupancyType.replace("_", " ")} />
              <ReviewRow label="Purpose" value={form.loanPurpose.replace("_", " ")} />
              {form.purchasePrice && <ReviewRow label="Purchase Price" value={formatCurrency(Number(form.purchasePrice))} />}
            </ReviewSection>
            <ReviewSection title="Loan">
              <ReviewRow label="Amount" value={formatCurrency(Number(form.loanAmount))} />
              <ReviewRow label="Type" value={form.loanType.toUpperCase()} />
              {form.downPayment && <ReviewRow label="Down Payment" value={formatCurrency(Number(form.downPayment))} />}
              {ltv && <ReviewRow label="LTV" value={`${ltv}%`} />}
              {selectedProduct && <ReviewRow label="Product" value={selectedProduct.name} />}
              <ReviewRow label="Loan Officer" value={form.loanOfficer} />
              {form.processor && <ReviewRow label="Processor" value={form.processor} />}
            </ReviewSection>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/")}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={
            (step === 1 && form.borrowerMode === "existing" && !form.borrowerId) ||
            (step === 1 && form.borrowerMode === "new" && (!form.firstName || !form.lastName || !form.email || !form.phone)) ||
            (step === 2 && !form.propertyAddress) ||
            (step === 3 && (!form.loanAmount || !form.loanOfficer))
          }>
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={creatingBorrower || creatingLoan}>
            {(creatingBorrower || creatingLoan) ? "Creating..." : "Submit Application"}
            <CheckCircle2 className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = "text", prefix, required, className }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; prefix?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}{required && <span className="text-destructive ml-1">*</span>}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          className={prefix ? "pl-7" : ""}
        />
      </div>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5 bg-muted/30 rounded-lg p-3">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
