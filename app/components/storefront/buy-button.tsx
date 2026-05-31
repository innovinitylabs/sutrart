"use client";

import { useState } from "react";
import { zeroAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import {
  abis,
  getNormalizedListingFields,
  type MarketListing,
} from "@sutrart/sdk";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/status-message";
import { useWriteContractFeedback } from "@/lib/use-write-contract-feedback";

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
  const {
    writeContract,
    isBusy,
    isSuccess,
    status,
    errorMessage,
    setPendingStatus,
  } = useWriteContractFeedback();
  const [localError, setLocalError] = useState("");

  const normalized = getNormalizedListingFields(listing);
  const disabled =
    !isConnected ||
    isBusy ||
    !normalized.valid ||
    address?.toLowerCase() === normalized.seller.toLowerCase();

  function buy() {
    setLocalError("");

    if (marketplaceFeeBps > BigInt(0) && marketplaceFeeRecipient === zeroAddress) {
      setLocalError("Marketplace fee recipient is required when feeBps > 0");
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
      setPendingStatus(`Buying onchain listing #${listing.listingId.toString()}...`);
      return;
    }

    writeContract({
      address: marketAddress,
      abi: abis.SutrartMarket,
      functionName: "buySignedListing",
      args: [listing.listing, listing.signature, marketplaceFeeRecipient, marketplaceFeeBps],
      value: normalized.price,
    });
    setPendingStatus("Buying signed listing...");
  }

  return (
    <div className="space-y-1">
      <Button type="button" disabled={disabled} onClick={buy}>
        {isSuccess ? "Purchased" : isBusy ? "Processing..." : label}
      </Button>
      <StatusMessage message={status} error={localError || errorMessage || undefined} />
      {!normalized.valid ? (
        <p className="text-xs text-amber-700">This listing is not valid for purchase.</p>
      ) : null}
    </div>
  );
}
