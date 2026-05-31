import { anvil, arbitrum, base, mainnet, optimism, polygon, sepolia } from "viem/chains";
import { getDefaultChainId } from "./env.js";

export const supportedChains = [
  anvil,
  mainnet,
  sepolia,
  polygon,
  optimism,
  arbitrum,
  base,
] as const;

export type SupportedChain = (typeof supportedChains)[number];

export function getDefaultChain(): SupportedChain {
  const chainId = getDefaultChainId();
  return supportedChains.find((entry) => entry.id === chainId) ?? anvil;
}

/** @deprecated Prefer getDefaultChain() for env-aware resolution. */
export const defaultChain = anvil;
