import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { CopilotKit } from "@copilotkit/react-core";
import "@copilotkit/react-ui/styles.css";
import AgentHub from "@/pages/agent-hub";

const queryClient = new QueryClient();

export default function App() {
  return (
    <div>
      <CopilotKit runtimeUrl="/api/copilot">
        <QueryClientProvider client={queryClient}>
          <AgentHub />
          <Toaster />
        </QueryClientProvider>
      </CopilotKit>
    </div>
  );
}
