import { getContractAddress, getDefaultChain, getDefaultChainId, supportedChains } from "@sutrart/shared";
import { createPublicClient, http, type PublicClient } from "viem";

export function getServerPublicClient(chainId = getDefaultChainId()): PublicClient {
  const chain = supportedChains.find((entry) => entry.id === chainId) ?? getDefaultChain();

  return createPublicClient({
    chain,
    transport: http(),
  }) as PublicClient;
}

export function getServerMarketAddress(chainId = getDefaultChainId()) {
  return getContractAddress(chainId, "SutrartMarket");
}
