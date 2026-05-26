"use client";

import { sepolia } from "viem/chains";
import { useAccount, useChainId } from "wagmi";
import { getChainDisplayName, isSupportedDeploymentChain } from "@sutrart/shared";
import { useContractAddresses } from "@/lib/contracts";

export function ChainStatus() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { marketAddress, isSupportedChain } = useContractAddresses();

  const chainName = getChainDisplayName(chainId);
  const isSepolia = chainId === sepolia.id;

  return (
    <div className="rounded-lg border border-border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Active chain: <span className="font-medium">{chainName}</span> ({chainId})
        </p>
        {isSepolia ? <span className="text-xs uppercase tracking-wide text-muted-foreground">Sepolia staging</span> : null}
      </div>

      {!isConnected ? (
        <p className="mt-2 text-xs text-muted-foreground">Connect a wallet to interact with listings.</p>
      ) : null}

      {isConnected && !isSupportedChain ? (
        <p className="mt-2 text-xs text-amber-700">
          This network is not configured with a Sutrart deployment manifest. Switch to Anvil or Sepolia.
        </p>
      ) : null}

      {isConnected && isSupportedChain && marketAddress ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Market: {marketAddress}</p>
      ) : null}

      {isConnected && isSupportedDeploymentChain(chainId) ? (
        <p className="mt-1 text-xs text-muted-foreground">Deployment manifest resolved for this chain.</p>
      ) : null}
    </div>
  );
}
