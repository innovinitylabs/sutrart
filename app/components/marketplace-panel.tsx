"use client";

import { useCallback, useEffect, useState } from "react";
import { formatEther, zeroAddress, type Address } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import {
  abis,
  getMarketInventory,
  getMarketListingKey,
  getNormalizedListingFields,
  getProtocolFeeConfig,
  mergeSignedFeeds,
  previewMarketListingPayouts,
  type MarketListing,
  type PayoutPreview,
  type SignedListingFeedV1,
} from "@sutrart/sdk";
import { ChainStatus } from "@/components/chain-status";
import { FeedIngestionPanel } from "@/components/feed-ingestion-panel";
import { ListingValidityBadge } from "@/components/listing-validity-badge";
import { StatusMessage } from "@/components/status-message";
import { formatPanelError } from "@/components/status-message";
import { Button } from "@/components/ui/button";
import { useContractAddresses } from "@/lib/contracts";
import { useWriteContractFeedback } from "@/lib/use-write-contract-feedback";
import { loadAllLocalFeeds, mergeLocalFeeds } from "@/lib/syndication";

function ListingPayoutBreakdown({
  preview,
  error,
}: {
  preview: PayoutPreview | null;
  error: string | null;
}) {
  if (error) {
    return <p className="text-xs text-muted-foreground">{error}</p>;
  }

  if (!preview) {
    return <p className="text-xs text-muted-foreground">Loading payout preview...</p>;
  }

  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>Protocol fee: {formatEther(preview.protocolFee)} ETH</p>
      <p>Marketplace fee: {formatEther(preview.marketplaceFee)} ETH</p>
      <p>Royalty: {formatEther(preview.royaltyAmount)} ETH</p>
      <p>
        Royalty recipient:{" "}
        {preview.royaltyRecipient === zeroAddress ? "None" : preview.royaltyRecipient}
      </p>
      <p>Seller proceeds: {formatEther(preview.sellerProceeds)} ETH</p>
    </div>
  );
}

export function MarketplacePanel() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { marketAddress } = useContractAddresses();
  const {
    writeContract,
    isBusy,
    isSuccess,
    status: txStatus,
    errorMessage: txError,
    setPendingStatus,
  } = useWriteContractFeedback();

  const [listings, setListings] = useState<MarketListing[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [signedCount, setSignedCount] = useState(0);
  const [onchainCount, setOnchainCount] = useState(0);
  const [importedFeeds, setImportedFeeds] = useState<SignedListingFeedV1[]>([]);
  const [remoteFeeds, setRemoteFeeds] = useState<SignedListingFeedV1[]>([]);
  const [status, setStatus] = useState<string>("");
  const [protocolFeeBps, setProtocolFeeBps] = useState<bigint>(BigInt(0));
  const [marketplaceFeeBps, setMarketplaceFeeBps] = useState<bigint>(BigInt(0));
  const [maxMarketplaceFeeBps, setMaxMarketplaceFeeBps] = useState<bigint>(BigInt(0));
  const [marketplaceFeeRecipient, setMarketplaceFeeRecipient] = useState<Address>(zeroAddress);
  const [payoutPreviews, setPayoutPreviews] = useState<Record<string, PayoutPreview>>({});
  const [payoutErrors, setPayoutErrors] = useState<Record<string, string>>({});
  const [discoveryError, setDiscoveryError] = useState("");

  const refreshListings = useCallback(async () => {
    if (!publicClient || !marketAddress || !chainId) {
      setListings([]);
      setSignedCount(0);
      setOnchainCount(0);
      setInvalidCount(0);
      return;
    }

    setDiscoveryError("");

    try {
      const localFeeds = loadAllLocalFeeds(chainId, address);
      const mergedLocal = mergeLocalFeeds(localFeeds);
      const signedFeeds = [...(mergedLocal ? [mergedLocal] : []), ...remoteFeeds, ...importedFeeds];

      const inventory = await getMarketInventory({
        publicClient,
        marketAddress,
        chainId,
        signedFeeds,
        conflictPolicy: "include-all",
      });

      setListings(inventory.listings.filter((listing) => listing.valid));
      setInvalidCount(inventory.totalCount - inventory.validCount);
      setOnchainCount(inventory.onchain.filter((listing) => listing.valid).length);
      setSignedCount(inventory.signed.filter((listing) => listing.valid).length);
    } catch (error) {
      setDiscoveryError(formatPanelError(error, "Unable to load marketplace inventory."));
      setListings([]);
      setInvalidCount(0);
      setSignedCount(0);
      setOnchainCount(0);
    }
  }, [address, chainId, importedFeeds, marketAddress, publicClient, remoteFeeds]);

  const refreshPayoutPreviews = useCallback(async () => {
    if (!publicClient || !marketAddress || listings.length === 0) {
      setPayoutPreviews({});
      setPayoutErrors({});
      return;
    }

    const nextPreviews: Record<string, PayoutPreview> = {};
    const nextErrors: Record<string, string> = {};

    await Promise.all(
      listings.map(async (listing) => {
        const key = getMarketListingKey(listing);
        try {
          nextPreviews[key] = await previewMarketListingPayouts(
            publicClient,
            marketAddress,
            listing,
            marketplaceFeeBps
          );
        } catch (error) {
          nextErrors[key] =
            error instanceof Error ? error.message : "Unable to preview payouts";
        }
      })
    );

    setPayoutPreviews(nextPreviews);
    setPayoutErrors(nextErrors);
  }, [listings, marketAddress, marketplaceFeeBps, publicClient]);

  useEffect(() => {
    void refreshListings();
  }, [refreshListings, isSuccess]);

  useEffect(() => {
    void refreshPayoutPreviews();
  }, [refreshPayoutPreviews]);

  useEffect(() => {
    if (!publicClient || !marketAddress) return;

    void (async () => {
      const config = await getProtocolFeeConfig(publicClient, marketAddress);
      setProtocolFeeBps(config.protocolFeeBps);
      setMaxMarketplaceFeeBps(config.maxMarketplaceFeeBps);
    })();
  }, [publicClient, marketAddress]);

  useEffect(() => {
    if (address && marketplaceFeeRecipient === zeroAddress) {
      setMarketplaceFeeRecipient(address);
    }
  }, [address, marketplaceFeeRecipient]);

  const displayStatus = txError || status || txStatus;

  function buyListing(listing: MarketListing) {
    if (!marketAddress) {
      return;
    }

    if (marketplaceFeeBps > BigInt(0) && marketplaceFeeRecipient === zeroAddress) {
      setStatus("Marketplace fee recipient is required when feeBps > 0");
      return;
    }

    const normalized = getNormalizedListingFields(listing);

    if (listing.kind === "onchain") {
      writeContract({
        address: marketAddress,
        abi: abis.SutrartMarket,
        functionName: "buyListing",
        args: [listing.listingId, marketplaceFeeRecipient, marketplaceFeeBps],
        value: listing.price,
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
    setPendingStatus(`Buying signed listing for token #${normalized.tokenId.toString()}...`);
  }

  if (!marketAddress) {
    return (
      <div className="space-y-4">
        <ChainStatus />
        <p className="text-muted-foreground text-sm">
          No deployment manifest found for this chain. Switch to Anvil or deploy to Sepolia.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChainStatus />

      <div className="flex items-center justify-between gap-4">
        <p className="text-muted-foreground text-xs">Market: {marketAddress}</p>
        <Button type="button" variant="outline" onClick={() => void refreshListings()} disabled={isBusy}>
          Refresh
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        Unified inventory: {onchainCount} onchain, {signedCount} signed (valid only).
        {invalidCount > 0 ? ` ${invalidCount} invalid or stale listing(s) hidden.` : null}
      </p>

      <StatusMessage message={displayStatus} error={discoveryError || undefined} />

      {chainId ? (
        <FeedIngestionPanel
          chainId={chainId}
          onFeedsChange={(feeds) => {
            setRemoteFeeds(feeds);
            if (feeds.length > 1) {
              try {
                setImportedFeeds([mergeSignedFeeds(feeds)]);
              } catch (error) {
                console.warn("[sutrart] mergeSignedFeeds failed in marketplace ingest panel.", {
                  chainId,
                  error: error instanceof Error ? error.message : String(error),
                });
                setImportedFeeds(feeds);
              }
            } else {
              setImportedFeeds(feeds);
            }
          }}
        />
      ) : null}

      <section className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Marketplace fee (execution-time)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Marketplace fee recipient</p>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={marketplaceFeeRecipient}
              onChange={(e) => setMarketplaceFeeRecipient(e.target.value as Address)}
            />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Marketplace fee (BPS)</p>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={marketplaceFeeBps.toString()}
              onChange={(e) => {
                try {
                  const parsed = BigInt(e.target.value || "0");
                  setMarketplaceFeeBps(
                    parsed > maxMarketplaceFeeBps && maxMarketplaceFeeBps > BigInt(0)
                      ? maxMarketplaceFeeBps
                      : parsed
                  );
                } catch {
                  // Ignore parse errors while typing.
                }
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Protocol fee: {protocolFeeBps.toString()} BPS (from contract)
        </p>
      </section>

      {listings.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active valid listings.</p>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => {
            const key = getMarketListingKey(listing);
            const normalized = getNormalizedListingFields(listing);
            return (
              <div key={key} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm">
                    {listing.kind === "onchain"
                      ? `Onchain listing #${listing.listingId.toString()}`
                      : "Signed listing"}
                  </p>
                  <ListingValidityBadge listing={listing} />
                </div>
                <p className="text-sm text-muted-foreground">Seller: {normalized.seller}</p>
                <p className="text-sm text-muted-foreground">
                  Token #{normalized.tokenId.toString()} on {normalized.nftContract}
                </p>
                <p className="text-sm">Price: {formatEther(normalized.price)} ETH</p>
                <ListingPayoutBreakdown
                  preview={payoutPreviews[key] ?? null}
                  error={payoutErrors[key] ?? null}
                />
                <Button
                  type="button"
                  disabled={
                    !isConnected ||
                    isBusy ||
                    address?.toLowerCase() === normalized.seller.toLowerCase() ||
                    Boolean(payoutErrors[key])
                  }
                  onClick={() => buyListing(listing)}
                >
                  {isBusy ? "Processing..." : "Buy listing"}
                </Button>
                {address?.toLowerCase() === normalized.seller.toLowerCase() ? (
                  <p className="text-xs text-muted-foreground">You cannot buy your own listing.</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
