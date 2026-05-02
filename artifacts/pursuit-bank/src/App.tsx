import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import NewLoan from "@/pages/new-loan";
import LoansList from "@/pages/loans/index";
import LoanDetail from "@/pages/loans/[id]";
import Escrow from "@/pages/escrow";
import Heloc from "@/pages/heloc";
import Tasks from "@/pages/tasks";
import BorrowersList from "@/pages/borrowers/index";
import BorrowerDetail from "@/pages/borrowers/[id]";
import RatesSheet from "@/pages/rates";
import ProductsList from "@/pages/products";
import KnowledgeBase from "@/pages/knowledge";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/new-loan" component={NewLoan} />
        <Route path="/pipeline" component={LoansList} />
        <Route path="/pipeline/:id" component={LoanDetail} />
        <Route path="/escrow" component={Escrow} />
        <Route path="/heloc" component={Heloc} />
        <Route path="/tasks" component={Tasks} />
        <Route path="/borrowers" component={BorrowersList} />
        <Route path="/borrowers/:id" component={BorrowerDetail} />
        <Route path="/rates" component={RatesSheet} />
        <Route path="/products" component={ProductsList} />
        <Route path="/knowledge" component={KnowledgeBase} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilot">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <CopilotPopup
            instructions={`You are Pursuit AI, an operations assistant for Pursuit Bank mortgage loan operations. You help operations staff:
- Manage the daily task queue (urgent tasks, conditions, document requests)
- Track escrow accounts: property tax disbursements, insurance payments, shortage analysis, escrow analysis cycles
- Process HELOC applications and manage draw requests, draw periods, repayment periods
- Originate new loan applications: guide through borrower intake, property details, product selection
- Monitor the loan pipeline: stage progression, processor assignments, closing dates
- Answer questions about mortgage products, underwriting guidelines, FHA/VA/USDA requirements, Fannie Mae/Freddie Mac guidelines
- Calculate LTV, DTI, monthly escrow payments, HELOC utilization
You have access to the full pipeline, escrow accounts, HELOC accounts, and task queue.`}
            defaultOpen={false}
            labels={{ title: "Pursuit AI — Operations", initial: "Hi! I can help you manage escrow, process HELOC applications, create loan tasks, or answer guideline questions. What do you need?" }}
          />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </CopilotKit>
  );
}

export default App;
