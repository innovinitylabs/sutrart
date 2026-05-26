"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { APP_NAME, SDK_VERSION } from "@sutrart/sdk";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/nav";
import { WalletStatus } from "@/components/wallet-status";

export function HomeContent() {
  return (
    <div>
      <Nav />
      <div className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-2xl flex-col justify-center gap-10 px-6 py-16">
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
            <Button type="button" variant="outline" asChild>
              <Link href="/my-nfts">My NFTs</Link>
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/marketplace">Marketplace</Link>
            </Button>
          </div>
          <WalletStatus />
          <p className="text-muted-foreground text-xs">SDK {SDK_VERSION}</p>
        </section>
      </div>
    </div>
  );
}
