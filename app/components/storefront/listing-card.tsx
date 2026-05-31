"use client";

import Link from "next/link";
import { formatEther, zeroAddress, type Address } from "viem";
import {
  buildOnchainListingPath,
  buildSignedListingPath,
  type ListingProvenance,
  type MarketListing,
  type NormalizedListingFields,
  type PayoutPreview,
} from "@pari/sdk";
import { BuyButton } from "@/components/storefront/buy-button";

export function ListingCard({
  listing,
  normalized,
  provenance,
  payoutPreview,
  marketAddress,
  href,
  showBuy = true,
}: {
  listing: MarketListing;
  normalized: NormalizedListingFields;
  provenance?: ListingProvenance;
  payoutPreview?: PayoutPreview | null;
  marketAddress?: Address;
  href?: string;
  showBuy?: boolean;
}) {
  const canonicalHref =
    href ??
    (listing.kind === "onchain"
      ? buildOnchainListingPath(listing.listingId)
      : buildSignedListingPath(listing.structHash));

  return (
    <article className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {listing.kind} listing
          </p>
          <p className="font-mono text-sm">
            Token #{normalized.tokenId.toString()} on {normalized.nftContract}
          </p>
        </div>
        <span
          className={
            normalized.valid
              ? "rounded-full border border-border px-2 py-1 text-xs"
              : "rounded-full border border-border px-2 py-1 text-xs text-muted-foreground"
          }
        >
          {normalized.valid ? "Valid" : "Stale"}
        </span>
      </div>

      <p className="text-sm">Price: {formatEther(normalized.price)} ETH</p>
      <p className="text-xs text-muted-foreground">Seller: {normalized.seller}</p>

      {provenance ? (
        <p className="text-xs text-muted-foreground">
          Source: {provenance.listingSource ?? "unknown"}
        </p>
      ) : null}

      {payoutPreview ? (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Seller proceeds: {formatEther(payoutPreview.sellerProceeds)} ETH</p>
          <p>Royalty: {formatEther(payoutPreview.royaltyAmount)} ETH</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={canonicalHref}
          className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm"
        >
          View listing
        </Link>
        {showBuy && marketAddress && normalized.valid ? (
          <BuyButton
            listing={listing}
            marketAddress={marketAddress}
            marketplaceFeeRecipient={zeroAddress}
            marketplaceFeeBps={BigInt(0)}
          />
        ) : null}
      </div>
    </article>
  );
}
