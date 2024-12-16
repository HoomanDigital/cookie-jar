export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "Ready to claim";

  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  return `${days}d ${hours}h ${minutes}m`;
};

export const formatEther = (wei: string | number): string => {
  return Number(wei) / 1e18 + " ETH";
};

export const shortenAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
