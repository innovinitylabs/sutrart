"use client";

import { getContractAddress } from "@sutrart/shared";
import { useChainId } from "wagmi";

export function useContractAddresses() {
  const chainId = useChainId();

  return {
    chainId,
    nftAddress: getContractAddress(chainId, "MockERC721"),
    marketAddress: getContractAddress(chainId, "SutrartMarket"),
  };
}
