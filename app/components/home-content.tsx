"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { APP_NAME, SDK_VERSION } from "@sutrart/sdk";
import { Button } from "@/components/ui/button";
import { WalletStatus } from "@/components/wallet-status";

export function HomeContent() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Sovereign NFT listings
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Onchain listing and settlement for Ethereum. Artists keep custody; marketplaces are
          interfaces, not escrow owners.
        </p>
      </header>

      <section className="border-border bg-card space-y-6 rounded-xl border p-6">
        <div className="flex flex-wrap items-center gap-4">
          <ConnectButton />
          <Button type="button" variant="outline" disabled>
            Explore listings
          </Button>
        </div>
        <WalletStatus />
        <p className="text-muted-foreground text-xs">SDK {SDK_VERSION}</p>
      </section>
    </div>
  );
}
