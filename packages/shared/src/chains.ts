import { arbitrum, base, mainnet, optimism, polygon, sepolia } from "viem/chains";

export const supportedChains = [mainnet, sepolia, polygon, optimism, arbitrum, base] as const;

export type SupportedChain = (typeof supportedChains)[number];

export const defaultChain = sepolia;
