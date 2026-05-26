"use client";

import { useAccount } from "wagmi";

export function WalletStatus() {
  const { address, isConnected, chain } = useAccount();

  if (!isConnected || !address) {
    return <p className="text-muted-foreground text-sm">Connect a wallet to continue.</p>;
  }

  return (
    <div className="text-muted-foreground space-y-1 font-mono text-sm">
      <p>
        <span className="text-foreground">Address:</span> {address}
      </p>
      {chain ? (
        <p>
          <span className="text-foreground">Chain:</span> {chain.name} ({chain.id})
        </p>
      ) : null}
    </div>
  );
}
