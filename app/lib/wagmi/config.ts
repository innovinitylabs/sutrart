import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { APP_NAME, getWalletConnectProjectId, supportedChains } from "@sutrart/shared";
import type { Config } from "wagmi";

const projectId = getWalletConnectProjectId() || "00000000000000000000000000000000";

export const wagmiConfig: Config = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: [...supportedChains],
  ssr: true,
});
