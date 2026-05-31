"use client";

import { getContractAddress, isSupportedDeploymentChain } from "@pari/shared";
import { useChainId } from "wagmi";

export function useContractAddresses() {
  const chainId = useChainId();

  return {
    chainId,
    isSupportedChain: isSupportedDeploymentChain(chainId),
    nftAddress: getContractAddress(chainId, "MockERC721"),
    marketAddress: getContractAddress(chainId, "PariMarket"),
  };
}
