import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { APP_NAME, getWalletConnectProjectId, getWalletChains } from "@pari/shared";
import type { Config } from "wagmi";

const projectId = getWalletConnectProjectId() || "00000000000000000000000000000000";

export const wagmiConfig: Config = getDefaultConfig({
  appName: APP_NAME,
  projectId,
  chains: getWalletChains(),
  ssr: true,
});
