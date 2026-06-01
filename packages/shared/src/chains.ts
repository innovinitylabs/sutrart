import { anvil, baseSepolia, mainnet, sepolia } from "viem/chains";
import type { Chain } from "viem";
import {
  getDefaultChainId,
  getPublicBaseSepoliaRpcUrl,
  getPublicMainnetRpcUrl,
  getPublicSepoliaRpcUrl,
} from "./env.js";

/** Chains with active PARI deployment manifests (local + alpha testnets). */
export const alphaChains = [anvil, sepolia, baseSepolia] as const;

/**
 * Reserved for mainnet production launch — no deployment manifest yet.
 * Omitted from the wallet until NEXT_PUBLIC_MAINNET_RPC_URL is set. viem's
 * built-in mainnet RPC (https://eth.merkle.io) rejects browser CORS preflight.
 */
export const futureChains = [mainnet] as const;

export const supportedChains = [...alphaChains, ...futureChains] as const;

export type AlphaChain = (typeof alphaChains)[number];
export type SupportedChain = (typeof supportedChains)[number];

function withRpcUrl(chain: Chain, rpcUrl: string): Chain {
  return {
    ...chain,
    rpcUrls: {
      ...chain.rpcUrls,
      default: {
        http: [rpcUrl],
      },
    },
  };
}

function withOptionalRpcUrl(chain: Chain, rpcUrl: string | undefined): Chain {
  return rpcUrl ? withRpcUrl(chain, rpcUrl) : chain;
}

/** Browser-facing chains for wagmi / RainbowKit. Avoids CORS-blocked viem defaults. */
export function getWalletChains(): [Chain, ...Chain[]] {
  const chains: Chain[] = [
    withRpcUrl(anvil, "http://127.0.0.1:8545"),
    withOptionalRpcUrl(sepolia, getPublicSepoliaRpcUrl()),
    withOptionalRpcUrl(baseSepolia, getPublicBaseSepoliaRpcUrl()),
  ];

  const mainnetRpc = getPublicMainnetRpcUrl();
  if (mainnetRpc) {
    chains.push(withRpcUrl(mainnet, mainnetRpc));
  }

  return chains as [Chain, ...Chain[]];
}

export function getDefaultChain(): SupportedChain {
  const chainId = getDefaultChainId();
  return supportedChains.find((entry) => entry.id === chainId) ?? anvil;
}

/** @deprecated Prefer getDefaultChain() for env-aware resolution. */
export const defaultChain = anvil;
