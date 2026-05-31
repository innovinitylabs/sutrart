"use client";

import { sepolia } from "viem/chains";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  PARI_PROTOCOL_VERSION,
  getChainDisplayName,
  getDefaultChain,
  isSupportedDeploymentChain,
} from "@pari/shared";
import { useContractAddresses } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

const alphaChains = [getDefaultChain(), sepolia] as const;

export function ChainStatus() {
  const chainId = useChainId();
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { marketAddress, isSupportedChain } = useContractAddresses();

  const chainName = getChainDisplayName(chainId);
  const isSepolia = chainId === sepolia.id;
  const walletChainMismatch = isConnected && chain && chain.id !== chainId;

  return (
    <div className="rounded-lg border border-border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>
          Active chain: <span className="font-medium">{chainName}</span> ({chainId})
        </p>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Protocol {PARI_PROTOCOL_VERSION}
          {isSepolia ? " · Sepolia alpha" : null}
        </span>
      </div>

      {!isConnected ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Connect a wallet to interact with listings.
        </p>
      ) : null}

      {walletChainMismatch ? (
        <p className="mt-2 text-xs text-amber-700">
          Wallet network ({chain.name}) differs from the selected chain. Confirm the network in your
          wallet.
        </p>
      ) : null}

      {isConnected && !isSupportedChain ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-700">
            No PARI deployment manifest is available for this network. Switch to a supported alpha
            chain to continue.
          </p>
          <div className="flex flex-wrap gap-2">
            {alphaChains.map((target) => (
              <Button
                key={target.id}
                type="button"
                size="sm"
                variant="outline"
                disabled={isSwitching || chainId === target.id}
                onClick={() => switchChain({ chainId: target.id })}
              >
                Switch to {target.name}
              </Button>
            ))}
          </div>
        </div>
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
