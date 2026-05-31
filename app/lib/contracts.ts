"use client";

import { getContractAddress, getDefaultChainId, isSupportedDeploymentChain } from "@pari/shared";
import { useAccount, useChainId } from "wagmi";

export function useContractAddresses() {
  const { isConnected } = useAccount();
  const walletChainId = useChainId();
  const chainId = isConnected ? walletChainId : getDefaultChainId();

  return {
    chainId,
    isSupportedChain: isSupportedDeploymentChain(chainId),
    nftAddress: getContractAddress(chainId, "MockERC721"),
    marketAddress: getContractAddress(chainId, "PariMarket"),
  };
}
