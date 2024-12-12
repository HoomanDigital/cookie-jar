import ErrorBoundary from "@/components/ErrorBoundary";
import { CookieJarInterface } from "@/components/WithdrawalInterface";
import { CONTRACT_ADDRESS } from "@/config/contract";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WithdrawalHistory } from "./components/WithdrawalHistory";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-100 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-4 flex justify-end">
              <ConnectButton />
            </div>
            <CookieJarInterface contractAddress={CONTRACT_ADDRESS} />
            <WithdrawalHistory contractAddress={CONTRACT_ADDRESS} />
          </div>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
