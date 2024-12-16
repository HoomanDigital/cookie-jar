import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CONTRACT_ABI } from "@/config/contract";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ethers } from "ethers";
import {
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquare,
  User,
} from "lucide-react";
import React from "react";
import { useEnsName } from "wagmi";
import { mainnet } from "wagmi/chains";

interface WithdrawalEventBase {
  user: string;
  amount: string;
  note: string;
  tokenId: string;
  transactionHash: string;
  blockNumber: number;
}

const fetchInitialEvents = async (
  contractAddress: string,
  rpcUrl: string
): Promise<WithdrawalEventBase[]> => {
  let provider: ethers.providers.Provider;
  try {
    if (window.ethereum) {
      provider = new ethers.providers.Web3Provider(window.ethereum);
    } else {
      provider = new ethers.providers.JsonRpcProvider(
        `https://opt-mainnet.g.alchemy.com/v2/${rpcUrl}`
      );
    }

    const contract = new ethers.Contract(
      contractAddress,
      CONTRACT_ABI,
      provider
    );

    const filter = contract.filters.Withdrawal();
    const events = await contract.queryFilter(filter);

    return events
      .map((event) => ({
        user: event.args?.user,
        amount: ethers.utils.formatEther(event.args?.amount),
        note: event.args?.note,
        tokenId: event.args?.tokenId.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      }))
      .sort((a, b) => b.blockNumber - a.blockNumber);
  } catch (error) {
    console.error("Error loading initial events:", error);
    throw error;
  }
};

const useBlockTimestamp = (
  provider: ethers.providers.Provider,
  blockNumber: number
) => {
  return useQuery({
    queryKey: ["blockTimestamp", blockNumber],
    queryFn: async () => {
      const block = await provider.getBlock(blockNumber);
      return block.timestamp;
    },
    staleTime: Infinity,
  });
};

function WithdrawalHistoryItem({
  event,
  provider,
}: {
  event: WithdrawalEventBase;
  provider: ethers.providers.Provider;
}) {
  const { data: timestamp } = useBlockTimestamp(provider, event.blockNumber);
  const { data: ensName } = useEnsName({
    address: event.user as `0x${string}`,

    chainId: mainnet.id,
  });
  console.log(ensName, event.user);

  return (
    <div
      key={event.transactionHash}
      className="bg-white rounded-2xl border border-slate-200 
                         shadow-sm hover:shadow-md transition-all 
                         duration-300 ease-in-out overflow-hidden"
    >
      <div className="p-5 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row justify-between items-start mb-4 space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl text-slate-800">
                {event.amount} ETH
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider
                ${
                  event.tokenId !== "0"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                Claimed
              </span>
            </div>
          </div>

          <div className="flex items-center text-slate-500 text-sm gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {timestamp
                ? formatDistanceToNow(timestamp * 1000, { addSuffix: true })
                : "Loading..."}
            </span>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2 text-slate-700">
            <MessageSquare className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold text-sm">Note</span>
          </div>
          <div className="text-sm text-slate-600 italic">"{event.note}"</div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-3">
          <div className="flex items-center border border-purple-600 rounded-full px-3 py-1.5 text-white bg-purple-800 text-xs gap-2 mb-2 sm:mb-0">
            <User className="h-4 w-4" />
            <span>
              {ensName || `${event.user.slice(0, 6)}...${event.user.slice(-4)}`}
            </span>
          </div>
          <div className="flex space-x-4">
            <a
              href={`https://optimistic.etherscan.io/tx/${event.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800
                         transition-colors duration-200 text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Etherscan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WithdrawalHistory({
  contractAddress,
  rpcUrl = import.meta.env.VITE_ALCHEMY_KEY,
}: {
  contractAddress: string;
  rpcUrl?: string;
}) {
  const provider = React.useMemo(() => {
    return window.ethereum
      ? new ethers.providers.Web3Provider(window.ethereum)
      : new ethers.providers.JsonRpcProvider(
          `https://opt-mainnet.g.alchemy.com/v2/${rpcUrl}`
        );
  }, [rpcUrl]);

  const {
    data: events = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["withdrawalEvents", contractAddress],
    queryFn: () => fetchInitialEvents(contractAddress, rpcUrl),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="mt-6 max-w-lg mx-auto shadow-lg">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 text-sm">
              Loading withdrawal history...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-6 max-w-lg mx-auto shadow-lg">
        <CardContent className="p-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="flex items-center space-x-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>
                Failed to load withdrawal history:{" "}
                {error instanceof Error ? error.message : String(error)}
              </span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 max-w-lg mx-auto overflow-hidden shadow-xl border-slate-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100">
        <CardTitle className="flex items-center gap-3 text-slate-800">
          <FileText className="h-6 w-6 text-indigo-600" />
          <span>Withdrawal History</span>
        </CardTitle>
        <CardDescription className="text-slate-500">
          Comprehensive record of all withdrawals and associated messages
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[800px] md:pr-2">
          {events.length === 0 ? (
            <div className="p-6 text-center">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="flex items-center justify-center space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>No withdrawal history found for this contract</span>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {events.map((event) => (
                <WithdrawalHistoryItem
                  key={event.transactionHash}
                  event={event}
                  provider={provider}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
