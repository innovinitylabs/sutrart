import type { ListingProvenance } from "@sutrart/sdk";
import { zeroAddress } from "viem";

export function ListingProvenancePanel({ provenance }: { provenance: ListingProvenance }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
      <p className="font-medium">Listing provenance</p>
      <dl className="grid gap-2 text-xs text-muted-foreground">
        <div className="flex justify-between gap-4">
          <dt>Listing type</dt>
          <dd className="font-mono text-foreground">{provenance.listingType}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Creator</dt>
          <dd className="font-mono text-foreground">{provenance.creator}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Collection</dt>
          <dd className="font-mono text-foreground">{provenance.collection}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Token</dt>
          <dd className="font-mono text-foreground">#{provenance.tokenId.toString()}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Seller</dt>
          <dd className="font-mono text-foreground">{provenance.seller}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Token owner</dt>
          <dd className="font-mono text-foreground">{provenance.tokenOwner ?? "Unknown"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Listing source</dt>
          <dd className="font-mono text-foreground">{provenance.listingSource ?? "Unknown"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Settlement</dt>
          <dd className="font-mono text-foreground">{provenance.settlementSource}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Royalty recipient</dt>
          <dd className="font-mono text-foreground">
            {provenance.royaltyRecipient && provenance.royaltyRecipient !== zeroAddress
              ? provenance.royaltyRecipient
              : "None"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Royalty</dt>
          <dd className="font-mono text-foreground">
            {provenance.royaltyBps !== null ? `${provenance.royaltyBps.toString()} bps` : "None"}
          </dd>
        </div>
      </dl>
    </div>
  );
}
