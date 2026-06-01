import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  APP_NAME,
  getPublicSepoliaRpcUrl,
  getWalletConnectProjectId,
  supportedChains,
} from "@pari/shared";
import { http } from "viem";
import { sepolia } from "viem/chains";
import type { Config } from "wagmi";

const projectId = getWalletConnectProjectId() || "00000000000000000000000000000000";

export const wagmiConfig: Config = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: [...supportedChains],
  transports: {
    [sepolia.id]: http(getPublicSepoliaRpcUrl()),
  },
  ssr: true,
});
