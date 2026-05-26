"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { abis, getValidListings, type Listing } from "@sutrart/sdk";
import { Button } from "@/components/ui/button";
import { useContractAddresses } from "@/lib/contracts";

export function MarketplacePanel() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { marketAddress } = useContractAddresses();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [listings, setListings] = useState<Listing[]>([]);
  const [status, setStatus] = useState<string>("");

  const refreshListings = useCallback(async () => {
    if (!publicClient || !marketAddress) {
      setListings([]);
      return;
    }

    const validListings = await getValidListings(publicClient, marketAddress);
    setListings(validListings);
  }, [marketAddress, publicClient]);

  useEffect(() => {
    void refreshListings();
  }, [refreshListings, isSuccess]);

  const isBusy = isPending || isConfirming;

  function buyListing(listing: Listing) {
    if (!marketAddress) {
      return;
    }

    writeContract({
      address: marketAddress,
      abi: abis.SutrartMarket,
      functionName: "buyListing",
      args: [listing.listingId],
      value: listing.price,
    });
    setStatus(`Buying listing #${listing.listingId.toString()}...`);
  }

  if (!marketAddress) {
    return (
      <p className="text-muted-foreground text-sm">
        Local contract addresses are missing. Run `pnpm contracts:anvil` and `pnpm
        contracts:deploy:local`.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs">Market: {marketAddress}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void refreshListings()}
          disabled={isBusy}
        >
          Refresh
        </Button>
      </div>

      {status ? <p className="text-sm">{status}</p> : null}

      {listings.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active valid listings.</p>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.listingId.toString()}
              className="border-border space-y-3 rounded-lg border p-4"
            >
              <p className="font-mono text-sm">Listing #{listing.listingId.toString()}</p>
              <p className="text-muted-foreground text-sm">Seller: {listing.seller}</p>
              <p className="text-muted-foreground text-sm">
                Token #{listing.tokenId.toString()} on {listing.nftContract}
              </p>
              <p className="text-sm">Price: {formatEther(listing.price)} ETH</p>
              <Button
                type="button"
                disabled={
                  !isConnected || isBusy || address?.toLowerCase() === listing.seller.toLowerCase()
                }
                onClick={() => buyListing(listing)}
              >
                Buy listing
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
