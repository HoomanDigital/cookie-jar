export interface WithdrawalInterfaceProps {
  contractAddress: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ContractError {
  code: string;
  message: string;
}

export interface NFTData {
  tokenId: string;
  lastWithdrawal: number;
}

export type WithdrawalMode = "nft" | "whitelist";
