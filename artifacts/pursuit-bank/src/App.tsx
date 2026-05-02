import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotPopup } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import LoansList from "@/pages/loans/index";
import LoanDetail from "@/pages/loans/[id]";
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
        <Route path="/loans" component={LoansList} />
        <Route path="/loans/:id" component={LoanDetail} />
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
            instructions="You are Pursuit AI, a multi-agent assistant for loan officers. Help them navigate loans, check guidelines, compare products, and manage their pipeline."
            defaultOpen={false} 
            labels={{ title: "Pursuit AI", initial: "How can I help you manage your pipeline today?" }}
          />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </CopilotKit>
  );
}

export default App;
