import {
  CONTRACT_ABI,
  CONTRACT_ERRORS,
  MAX_NOTE_LENGTH,
} from "@/config/contract";
import type { WithdrawalInterfaceProps } from "@/types";
import { formatEther, formatTimeRemaining } from "@/utils/format";
import { validateNote } from "@/utils/validation";
import { AlertCircle, Clock, Cookie, Wallet } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { LoadingSpinner } from "./LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";

export const CookieJarInterface: React.FC<WithdrawalInterfaceProps> = ({
  contractAddress,
}) => {
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  const { address, isConnected, isConnecting } = useAccount();
  const { writeContract, isPending: txPending } = useWriteContract();

  // Contract reads
  const { data: isWhitelisted } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "isAllowedMember",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // Read last withdrawal time
  const { data: lastWithdrawalTime } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "lastWithdrawalTime",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  // Calculate if in waiting period
  const isInWaitingPeriod = useMemo(() => {
    if (!lastWithdrawalTime) return false;
    const TIME_INTERVAL = 30 * 24 * 60 * 60; // 30 days in seconds
    const currentTime = Math.floor(Date.now() / 1000); // current time in seconds
    const lastWithdrawalTimeNum = Number(
      (lastWithdrawalTime as bigint).toString()
    );
    return currentTime < lastWithdrawalTimeNum + TIME_INTERVAL;
  }, [lastWithdrawalTime]);

  // Calculate remaining time
  const nextClaimTime = useMemo(() => {
    if (!lastWithdrawalTime) return 0;
    const TIME_INTERVAL = 30 * 24 * 60 * 60; // 30 days in seconds
    const lastWithdrawalTimeNum = Number(
      (lastWithdrawalTime as bigint).toString()
    );
    return lastWithdrawalTimeNum + TIME_INTERVAL;
  }, [lastWithdrawalTime]);

  const { data: isPaused } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "isPaused",
  });

  const { data: amt } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: "WITHDRAWAL_AMOUNT",
  });

  // Update remaining time periodically
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isInWaitingPeriod) {
      intervalId = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);
        const remainingSeconds = Number(nextClaimTime) - currentTime;
        setRemainingTime(remainingSeconds > 0 ? remainingSeconds : 0);
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isInWaitingPeriod, nextClaimTime]);

  // Handle note change
  const handleNoteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const note = e.target.value;
    const validation = validateNote(note);
    if (!validation.valid) {
      setError(validation.error || null);
    } else {
      setError(null);
    }
    setWithdrawalNote(note);
  };

  // Handle withdrawal
  const handleWithdraw = async () => {
    if (isPaused) {
      setError(CONTRACT_ERRORS.ContractIsPaused);
      return;
    }

    const validation = validateNote(withdrawalNote);
    if (!validation.valid) {
      setError(validation.error || null);
      return;
    }

    try {
      if (isWhitelisted) {
        await writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "withdrawAsWhitelisted",
          args: [withdrawalNote],
        });
      }
    } catch (err: unknown) {
      const errorCode = (err as { code?: keyof typeof CONTRACT_ERRORS }).code;
      setError(
        errorCode ? CONTRACT_ERRORS[errorCode] : (err as Error).message || null
      );
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>The Cookie Jar</CardTitle>
          <CardDescription>
            Connect your wallet to check eligibility
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Wallet className="h-4 w-4" />
            <AlertTitle>Not Connected</AlertTitle>
            <AlertDescription>
              {isConnecting
                ? "Connecting..."
                : "Please connect your wallet using the button above to continue"}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Waiting period or paused state
  if (isInWaitingPeriod || isPaused) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>The Cookie Jar</CardTitle>
          <CardDescription>
            {isPaused ? "Contract Paused" : "Claim in Progress"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="flex justify-center items-center mb-4">
            <Cookie className="h-12 w-12 animate-bounce text-orange-500" />
            <Cookie className="h-16 w-16 animate-bounce text-brown-500 mx-4" />
            <Cookie className="h-12 w-12 animate-bounce text-orange-600" />
          </div>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertTitle>
              {isPaused ? "Contract Paused" : "Cookies are Baking!"}
            </AlertTitle>
            <AlertDescription>
              {isPaused
                ? "Withdrawals are currently disabled"
                : `Time until next claim: ${formatTimeRemaining(
                    remainingTime
                  )}`}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Claim interface
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>The Cookie Jar</CardTitle>
        <CardDescription>
          Claim {amt ? formatEther(amt.toString()) : "0"} monthly
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          {isWhitelisted ? (
            <>
              <Alert>
                <AlertTitle>Eligible for Whitelist Claim</AlertTitle>
                <AlertDescription>
                  Ready to claim your monthly cookies!
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Input
                  placeholder="Tell us why you love cookies... (min 20 characters)"
                  value={withdrawalNote}
                  onChange={handleNoteChange}
                  disabled={txPending}
                  maxLength={MAX_NOTE_LENGTH}
                />
                <p className="text-sm text-gray-500">
                  {withdrawalNote.length}/1000 characters
                </p>
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={Boolean(
                  txPending || withdrawalNote.length < 20 || isPaused
                )}
                className="w-full"
              >
                {txPending ? (
                  <>
                    <LoadingSpinner /> Processing...
                  </>
                ) : (
                  "GOOOO EEEEEET! 🍪"
                )}
              </Button>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTitle>Not Eligible</AlertTitle>
              <AlertDescription>Address is not whitelisted</AlertDescription>
            </Alert>
          )}
        </div>
        {txPending && (
          <Alert className="mt-4">
            <Clock className="h-4 w-4" />
            <AlertTitle>Transaction Pending</AlertTitle>
            <AlertDescription>
              Please wait while your transaction is being processed...
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
