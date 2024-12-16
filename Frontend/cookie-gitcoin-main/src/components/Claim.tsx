import { Cookie, ExternalLink, Gift } from "lucide-react";
import React from "react";
import { Card, CardContent } from "./ui/card";

import { CONTRACT_ABI } from "@/config/contract";
import { formatEther } from "viem";
import { useChainId, useReadContract } from "wagmi";

// Supported networks with their block explorers
const NETWORK_EXPLORERS = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
} as const;

interface CookieJarPublicInfoProps {
  contractAddress: `0x${string}`;
}

export const CookieJarPublicInfo: React.FC<CookieJarPublicInfoProps> = ({
  contractAddress,
}) => {
  const chainId = useChainId();

  // Read contract data
  const { data: balanceData, isLoading: isBalanceLoading } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "getContractBalance",
  });

  const { data: withdrawalAmountData, isLoading: isWithdrawalLoading } =
    useReadContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "WHITELIST_WITHDRAWAL_AMOUNT",
    });

  const { data: claimPeriodData, isLoading: isClaimPeriodLoading } =
    useReadContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "TIME_INTERVAL",
    });

  // Determine block explorer URL
  const explorerUrl =
    chainId && NETWORK_EXPLORERS[chainId as keyof typeof NETWORK_EXPLORERS]
      ? `${
          NETWORK_EXPLORERS[chainId as keyof typeof NETWORK_EXPLORERS]
        }/address/${contractAddress}`
      : `https://etherscan.io/address/${contractAddress}`;

  // Loading state
  if (isBalanceLoading || isWithdrawalLoading || isClaimPeriodLoading) {
    return (
      <Card className="w-full max-w-lg mx-auto animate-pulse mb-6">
        <CardContent className="p-6">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </CardContent>
      </Card>
    );
  }

  // Safely parse and format data
  const balance =
    balanceData && typeof balanceData === "bigint"
      ? parseFloat(formatEther(balanceData)).toFixed(4)
      : "0.0000";

  const withdrawalAmount =
    withdrawalAmountData && typeof withdrawalAmountData === "bigint"
      ? parseFloat(formatEther(withdrawalAmountData)).toFixed(4)
      : "0.0000";

  const claimPeriod = claimPeriodData
    ? Math.floor(Number(claimPeriodData) / 86400)
    : 30;

  return (
    <div className="space-y-4 mb-6">
      <Card className="w-full max-w-lg mx-auto bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-amber-900">
                Cookie Jar Balance
              </h2>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-amber-600 hover:text-amber-700 text-sm"
            >
              View on Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <div className="text-2xl font-bold text-amber-900">{balance} ETH</div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-lg mx-auto ">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Gift className="h-5 w-5 mr-2 text-green-600" />
            Withdrawal Terms
          </h2>
          <ul className="space-y-2 text-slate-600">
            <li className="flex items-center justify-between">
              <span className="text-sm font-medium">Claim Amount:</span>
              <span className="text-sm font-semibold">
                {withdrawalAmount} ETH
              </span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm font-medium">Claim Frequency:</span>
              <span className="text-sm">Every {claimPeriod} day</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-sm font-medium">Minimum Note:</span>
              <span className="text-sm">20 characters</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
