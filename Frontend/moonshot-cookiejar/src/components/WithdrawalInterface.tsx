import {
  CONTRACT_ABI,
  CONTRACT_ERRORS,
  MAX_NOTE_LENGTH,
} from "@/config/contract";
import type { WithdrawalInterfaceProps } from "@/types";
import { formatEther, formatTimeRemaining } from "@/utils/format";
import { validateNote } from "@/utils/validation";
import { ethers } from "ethers";
import { AlertCircle, Clock, Wallet } from "lucide-react";
import React, { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

export const CookieJarInterface: React.FC<WithdrawalInterfaceProps> = ({
  contractAddress,
}) => {
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [ownedNFTs, setOwnedNFTs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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

  const withdrawalAmount: any = amt;

  // Check eligibility and load NFTs
  const checkEligibility = async () => {
    if (!isConnected || !address) return;

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        provider
      );

      // First get balance
      const balance = await contract
        .MOONSHOTBOT_CONTRACT()
        .then((moonshotContract: any) =>
          new ethers.Contract(
            moonshotContract,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          ).balanceOf(address)
        );

      // Only fetch NFTs if balance > 0
      if (balance.toNumber() > 0) {
        const nfts = await contract.getNFTsForAddress(
          address,
          0,
          balance.toNumber()
        );
        setOwnedNFTs(nfts.map((nft: ethers.BigNumber) => nft.toString()));
      } else {
        setOwnedNFTs([]);
      }

      // Get remaining time
      if (isWhitelisted) {
        const time = await contract.getRemainingTime();
        setRemainingTime(time.toNumber());
      } else if (selectedNFT) {
        const time = await contract.getRemainingTimeForNFT(selectedNFT);
        setRemainingTime(time.toNumber());
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, [address, isConnected, selectedNFT]);

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
      if (isWhitelisted && ownedNFTs.length === 0) {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "withdrawAsWhitelisted",
          args: [withdrawalNote],
        });
      } else if (selectedNFT) {
        writeContract({
          address: contractAddress as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: "withdrawWithNFT",
          args: [withdrawalNote, selectedNFT],
        });
      }
    } catch (err: unknown) {
      const errorCode = (err as { code?: keyof typeof CONTRACT_ERRORS }).code;
      setError(
        errorCode ? CONTRACT_ERRORS[errorCode] : (err as Error).message || null
      );
    }
  };

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

  if (loading) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="p-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>The Cookie Jar</CardTitle>
        <CardDescription>
          Claim {withdrawalAmount ? formatEther(withdrawalAmount) : "0"} monthly
          {!!isPaused && " (Currently Paused)"}
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
        <Tabs defaultValue={isWhitelisted ? "whitelist" : "nft"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="whitelist"
              disabled={Boolean(!isWhitelisted || ownedNFTs.length > 0)}
            >
              Whitelist Claim
            </TabsTrigger>
            <TabsTrigger value="nft" disabled={Boolean(ownedNFTs.length === 0)}>
              NFT Claim
            </TabsTrigger>
          </TabsList>

          <TabsContent value="whitelist">
            <div className="space-y-4">
              {isWhitelisted && ownedNFTs.length === 0 ? (
                <>
                  <Alert>
                    <AlertTitle>Eligible for Whitelist Claim</AlertTitle>
                    <AlertDescription>
                      Time until next claim:{" "}
                      {formatTimeRemaining(remainingTime)}
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Input
                      placeholder="Tell us why you love cookies... (min 20 characters)"
                      value={withdrawalNote}
                      onChange={handleNoteChange}
                      disabled={Boolean(remainingTime > 0 || txPending)}
                      maxLength={MAX_NOTE_LENGTH}
                    />
                    <p className="text-sm text-gray-500">
                      {withdrawalNote.length}/1000 characters
                    </p>
                  </div>
                  <Button
                    onClick={handleWithdraw}
                    disabled={Boolean(
                      remainingTime > 0 ||
                        txPending ||
                        withdrawalNote.length < 20 ||
                        isPaused
                    )}
                    className="w-full"
                  >
                    {txPending ? (
                      <>
                        <LoadingSpinner /> Processing...
                      </>
                    ) : remainingTime > 0 ? (
                      <>
                        <Clock className="mr-2 h-4 w-4" /> Waiting Period Active
                      </>
                    ) : (
                      "GOOOO EEEEEET! 🍪"
                    )}
                  </Button>
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertTitle>Not Eligible</AlertTitle>
                  <AlertDescription>
                    {ownedNFTs.length > 0
                      ? "NFT holders cannot use whitelist withdrawal"
                      : "Address is not whitelisted"}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="nft">
            <div className="space-y-4">
              {ownedNFTs.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {ownedNFTs.map((tokenId) => (
                      <Button
                        key={tokenId}
                        variant={
                          selectedNFT === tokenId ? "default" : "outline"
                        }
                        onClick={() => setSelectedNFT(tokenId)}
                        className="w-full"
                        disabled={Boolean(txPending)}
                      >
                        Token #{tokenId}
                      </Button>
                    ))}
                  </div>

                  {selectedNFT && (
                    <>
                      <Alert>
                        <AlertTitle>Selected NFT #{selectedNFT}</AlertTitle>
                        <AlertDescription>
                          Time until next claim:{" "}
                          {formatTimeRemaining(remainingTime)}
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-2">
                        <Input
                          placeholder="Tell us why you love cookies... (min 20 characters)"
                          value={withdrawalNote}
                          onChange={handleNoteChange}
                          disabled={Boolean(remainingTime > 0 || txPending)}
                          maxLength={MAX_NOTE_LENGTH}
                        />
                        <p className="text-sm text-gray-500">
                          {withdrawalNote.length}/1000 characters
                        </p>
                      </div>
                      <Button
                        onClick={handleWithdraw}
                        disabled={Boolean(
                          remainingTime > 0 ||
                            txPending ||
                            withdrawalNote.length < 20 ||
                            isPaused
                        )}
                        className="w-full"
                      >
                        {txPending ? (
                          <>
                            <LoadingSpinner /> Processing...
                          </>
                        ) : remainingTime > 0 ? (
                          <>
                            <Clock className="mr-2 h-4 w-4" /> Waiting Period
                            Active
                          </>
                        ) : (
                          "Claim with NFT"
                        )}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertTitle>Not Eligible</AlertTitle>
                  <AlertDescription>
                    You don't own any eligible NFTs
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
