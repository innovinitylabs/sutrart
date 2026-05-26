"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAddress, isAddress } from "viem";
import { usePublicClient } from "wagmi";
import {
  buildSignedListingPath,
  getCreatorSignedListings,
  type CreatorSignedListingEntry,
} from "@sutrart/sdk";
import { loadCreatorFeed } from "@/lib/syndication";
import { useContractAddresses } from "@/lib/contracts";

export function CreatorStorefrontSyndication({ creatorAddress }: { creatorAddress: string }) {
  const publicClient = usePublicClient();
  const { marketAddress, chainId } = useContractAddresses();
  const [entries, setEntries] = useState<CreatorSignedListingEntry[]>([]);

  useEffect(() => {
    if (!publicClient || !marketAddress || !chainId || !isAddress(creatorAddress)) {
      setEntries([]);
      return;
    }

    const creator = getAddress(creatorAddress);
    const feed = loadCreatorFeed(chainId, creator);
    if (!feed) {
      setEntries([]);
      return;
    }

    void getCreatorSignedListings(publicClient, marketAddress, creator, [feed]).then(setEntries);
  }, [chainId, creatorAddress, marketAddress, publicClient]);

  const active = entries.filter((entry) => entry.valid);

  if (active.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Syndicated signed listings</h2>
      <p className="text-sm text-muted-foreground">
        Portable signed orders published to the creator feed manifest.
      </p>
      <div className="space-y-2">
        {active.map((entry) => (
          <Link
            key={entry.structHash}
            href={buildSignedListingPath(entry.structHash)}
            className="block rounded-lg border border-border p-4 text-sm hover:bg-muted/30"
          >
            Token #{entry.order.listing.tokenId.toString()} ·{" "}
            {entry.order.source ?? "creator-feed"}
          </Link>
        ))}
      </div>
    </section>
  );
}
