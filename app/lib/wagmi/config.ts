import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  APP_NAME,
  getPublicBaseSepoliaRpcUrl,
  getPublicSepoliaRpcUrl,
  getWalletConnectProjectId,
  supportedChains,
} from "@pari/shared";
import type { Chain } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import type { Config } from "wagmi";

const projectId = getWalletConnectProjectId() || "00000000000000000000000000000000";

function buildChainWithRpc(chain: Chain, rpcUrl: string | undefined): Chain {
  if (!rpcUrl) {
    return chain;
  }

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

function buildSepoliaChain(): Chain {
  return buildChainWithRpc(sepolia, getPublicSepoliaRpcUrl());
}

function buildBaseSepoliaChain(): Chain {
  return buildChainWithRpc(baseSepolia, getPublicBaseSepoliaRpcUrl());
}

const chains: Chain[] = supportedChains.map((chain) => {
  if (chain.id === sepolia.id) {
    return buildSepoliaChain();
  }
  if (chain.id === baseSepolia.id) {
    return buildBaseSepoliaChain();
  }
  return chain;
});

export const wagmiConfig: Config = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: chains as [Chain, ...Chain[]],
  ssr: true,
});
