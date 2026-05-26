"use client";

import { zeroAddress } from "viem";
import type { MarketListing } from "@sutrart/sdk";
import { BuyButton } from "@/components/storefront/buy-button";

export function ListingPurchasePanel({
  listing,
  marketAddress,
}: {
  listing: MarketListing;
  marketAddress: `0x${string}`;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Settlement</p>
      <p className="text-xs text-muted-foreground">
        Purchases settle through the Sutrart protocol diamond.
      </p>
      <BuyButton
        listing={listing}
        marketAddress={marketAddress}
        marketplaceFeeRecipient={zeroAddress}
        marketplaceFeeBps={BigInt(0)}
      />
    </section>
  );
}
