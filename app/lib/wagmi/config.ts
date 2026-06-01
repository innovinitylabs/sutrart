import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { APP_NAME, getPublicSepoliaRpcUrl, getWalletConnectProjectId, supportedChains } from "@pari/shared";
import type { Chain } from "viem";
import { sepolia } from "viem/chains";
import type { Config } from "wagmi";

const projectId = getWalletConnectProjectId() || "00000000000000000000000000000000";

function buildSepoliaChain(): Chain {
  const sepoliaRpcUrl = getPublicSepoliaRpcUrl();
  if (!sepoliaRpcUrl) {
    return sepolia;
  }

  return {
    ...sepolia,
    rpcUrls: {
      ...sepolia.rpcUrls,
      default: {
        http: [sepoliaRpcUrl],
      },
    },
  };
}

const chains: Chain[] = supportedChains.map((chain) =>
  chain.id === sepolia.id ? buildSepoliaChain() : chain
);

export const wagmiConfig: Config = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: chains as [Chain, ...Chain[]],
  ssr: true,
});
