import { formatEther, zeroAddress } from "viem";
import type { ListingPageData } from "@sutrart/sdk";
import { ListingProvenancePanel } from "@/components/storefront/listing-provenance";
import { ListingPurchasePanel } from "@/components/storefront/listing-purchase-panel";

export function ListingPageView({
  data,
  marketAddress,
}: {
  data: ListingPageData;
  marketAddress: `0x${string}`;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {data.listing.kind} listing
        </p>
        <h1 className="text-3xl font-semibold">
          Token #{data.normalized.tokenId.toString()}
        </h1>
        <p className="text-muted-foreground text-sm">
          {data.valid ? "Valid listing" : "Listing is stale or invalid"}
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
        <div className="space-y-2 text-sm">
          <p>Price: {formatEther(data.normalized.price)} ETH</p>
          <p className="text-muted-foreground">Seller: {data.normalized.seller}</p>
          <p className="text-muted-foreground">Collection: {data.normalized.nftContract}</p>
        </div>
        {data.payoutPreview ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Protocol fee: {formatEther(data.payoutPreview.protocolFee)} ETH</p>
            <p>Marketplace fee: {formatEther(data.payoutPreview.marketplaceFee)} ETH</p>
            <p>Royalty: {formatEther(data.payoutPreview.royaltyAmount)} ETH</p>
            <p>Seller proceeds: {formatEther(data.payoutPreview.sellerProceeds)} ETH</p>
            <p>
              Royalty recipient:{" "}
              {data.payoutPreview.royaltyRecipient === zeroAddress
                ? "None"
                : data.payoutPreview.royaltyRecipient}
            </p>
          </div>
        ) : null}
      </div>

      <ListingProvenancePanel provenance={data.provenance} />

      {data.valid ? (
        <ListingPurchasePanel listing={data.listing} marketAddress={marketAddress} />
      ) : null}
    </div>
  );
}
