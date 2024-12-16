import ErrorBoundary from "@/components/ErrorBoundary";
import { CookieJarInterface } from "@/components/WithdrawalInterface";
import { CONTRACT_ADDRESS } from "@/config/contract";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookieJarPublicInfo } from "./components/Claim";
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
            <CookieJarPublicInfo contractAddress={CONTRACT_ADDRESS} />
            <CookieJarInterface contractAddress={CONTRACT_ADDRESS} />
            <WithdrawalHistory contractAddress={CONTRACT_ADDRESS} />
          </div>
          <footer className="flex items-center justify-center py-4 mt-10">
            <img src="/allo.jpg" alt="Logo" className="h-8 mr-2" />
            <span>
              Powered by{" "}
              <a
                target="_blank"
                href="https://allo.capital"
                className="text-blue-500"
              >
                allo.capital
              </a>
            </span>
          </footer>
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
