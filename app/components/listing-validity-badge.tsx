"use client";

import type { MarketListing } from "@pari/sdk";
import { getNormalizedListingFields } from "@pari/sdk";

export function ListingValidityBadge({ listing }: { listing: MarketListing }) {
  const normalized = getNormalizedListingFields(listing);

  if (normalized.valid) {
    return (
      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
        Valid · {listing.kind}
      </span>
    );
  }

  return (
    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
      Invalid · {listing.kind}
    </span>
  );
}

export function SignedListingStateHint({
  expired,
  filled,
  valid,
}: {
  expired?: boolean;
  filled?: boolean;
  valid: boolean;
}) {
  if (valid) {
    return <p className="text-xs text-muted-foreground">Onchain validation: valid and fulfillable.</p>;
  }

  if (filled) {
    return <p className="text-xs text-amber-700">Already filled onchain.</p>;
  }

  if (expired) {
    return <p className="text-xs text-amber-700">Expired. Remove from feed or sign a new listing.</p>;
  }

  return (
    <p className="text-xs text-amber-700">
      Invalid onchain. Common causes: revoked nonce, missing approval, or ownership change.
    </p>
  );
}
