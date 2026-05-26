import { createPublicClient, http, type PublicClient } from "viem";
import { defaultChain, getContractAddress, supportedChains } from "@sutrart/shared";

export function getServerPublicClient(chainId = defaultChain.id): PublicClient {
  const chain = supportedChains.find((entry) => entry.id === chainId) ?? defaultChain;

  return createPublicClient({
    chain,
    transport: http(),
  });
}

export function getServerMarketAddress(chainId = defaultChain.id) {
  return getContractAddress(chainId, "SutrartMarket");
}
