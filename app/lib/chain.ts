import {
  getBaseSepoliaRpcUrl,
  getContractAddress,
  getDefaultChain,
  getDefaultChainId,
  getMainnetRpcUrl,
  getSepoliaRpcUrl,
  supportedChains,
} from "@pari/shared";
import { createPublicClient, http, type PublicClient } from "viem";
import { anvil, baseSepolia, mainnet, sepolia } from "viem/chains";

function getServerRpcUrl(chainId: number): string | undefined {
  if (chainId === sepolia.id) {
    return getSepoliaRpcUrl();
  }
  if (chainId === baseSepolia.id) {
    return getBaseSepoliaRpcUrl();
  }
  if (chainId === mainnet.id) {
    return getMainnetRpcUrl();
  }
  if (chainId === anvil.id) {
    return "http://127.0.0.1:8545";
  }
  return undefined;
}

export function getServerPublicClient(chainId = getDefaultChainId()): PublicClient {
  const chain = supportedChains.find((entry) => entry.id === chainId) ?? getDefaultChain();
  const rpcUrl = getServerRpcUrl(chainId);

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  }) as PublicClient;
}

export function getServerMarketAddress(chainId = getDefaultChainId()) {
  return getContractAddress(chainId, "PariMarket");
}
