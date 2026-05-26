"use client";

import { useState } from "react";
import { zeroAddress, type Address } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import {
  abis,
  getNormalizedListingFields,
  type MarketListing,
} from "@sutrart/sdk";
import { Button } from "@/components/ui/button";

export function BuyButton({
  listing,
  marketAddress,
  marketplaceFeeRecipient,
  marketplaceFeeBps,
  label = "Buy listing",
}: {
  listing: MarketListing;
  marketAddress: Address;
  marketplaceFeeRecipient: Address;
  marketplaceFeeBps: bigint;
  label?: string;
}) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [status, setStatus] = useState<string>("");

  const normalized = getNormalizedListingFields(listing);
  const isBusy = isPending || isConfirming;
  const disabled =
    !isConnected ||
    isBusy ||
    !normalized.valid ||
    address?.toLowerCase() === normalized.seller.toLowerCase();

  function buy() {
    if (marketplaceFeeBps > BigInt(0) && marketplaceFeeRecipient === zeroAddress) {
      setStatus("Marketplace fee recipient is required when feeBps > 0");
      return;
    }

    if (listing.kind === "onchain") {
      writeContract({
        address: marketAddress,
        abi: abis.SutrartMarket,
        functionName: "buyListing",
        args: [listing.listingId, marketplaceFeeRecipient, marketplaceFeeBps],
        value: normalized.price,
      });
      setStatus(`Buying onchain listing #${listing.listingId.toString()}...`);
      return;
    }

    writeContract({
      address: marketAddress,
      abi: abis.SutrartMarket,
      functionName: "buySignedListing",
      args: [listing.listing, listing.signature, marketplaceFeeRecipient, marketplaceFeeBps],
      value: normalized.price,
    });
    setStatus(`Buying signed listing...`);
  }

  return (
    <div className="space-y-1">
      <Button type="button" disabled={disabled} onClick={buy}>
        {isSuccess ? "Purchased" : isBusy ? "Processing..." : label}
      </Button>
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}
