"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import {
  abis,
  buildCreatorStorefrontPath,
  buildSignedListingDraft,
  buildSignedListingPath,
  createSignedListingFeed,
  getCreatorSignedListings,
  getSignedListingMinNonce,
  previewSignedPayouts,
  publishSignedListing,
  pruneStaleSignedListingFeed,
  signSignedListing,
  type CreatorInventory,
  type CreatorSignedListingEntry,
  type InventoryToken,
  type SignedListingFeedV1,
} from "@sutrart/sdk";
import { getChainDisplayName, getAppUrl } from "@sutrart/shared";
import { Button } from "@/components/ui/button";
import {
  exportCreatorFeed,
  importCreatorFeed,
  loadCreatorFeed,
  saveCreatorFeed,
} from "@/lib/syndication";
import { useContractAddresses } from "@/lib/contracts";

export function CreatorSignedListingsPanel({
  inventory,
  onRefresh,
}: {
  inventory: CreatorInventory | null;
  onRefresh: () => Promise<void>;
}) {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { marketAddress, isSupportedChain } = useContractAddresses();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [signedPriceByToken, setSignedPriceByToken] = useState<Record<string, string>>({});
  const [expiryHoursByToken, setExpiryHoursByToken] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<CreatorSignedListingEntry[]>([]);
  const [feed, setFeed] = useState<SignedListingFeedV1 | null>(null);
  const [importJson, setImportJson] = useState("");
  const [status, setStatus] = useState("");

  const isBusy = isPending || isConfirming;

  const refreshSignedState = useCallback(async () => {
    if (!publicClient || !marketAddress || !address || !chainId) {
      setEntries([]);
      setFeed(null);
      return;
    }

    const localFeed = loadCreatorFeed(chainId, address);
    setFeed(localFeed);

    if (!localFeed) {
      setEntries([]);
      return;
    }

    const nextEntries = await getCreatorSignedListings(
      publicClient,
      marketAddress,
      address,
      [localFeed]
    );
    setEntries(nextEntries);
  }, [address, chainId, marketAddress, publicClient]);

  useEffect(() => {
    void refreshSignedState();
  }, [refreshSignedState, isSuccess]);

  useEffect(() => {
    if (isSuccess) {
      void onRefresh();
      void refreshSignedState();
    }
  }, [isSuccess, onRefresh, refreshSignedState]);

  const unlistedTokens = inventory?.unlisted ?? [];

  async function signAndPublish(token: InventoryToken) {
    if (!publicClient || !walletClient || !marketAddress || !address || !chainId || !isSupportedChain) {
      return;
    }

    const key = `${token.collection}-${token.tokenId.toString()}`;
    const priceInput = signedPriceByToken[key] ?? "0.01";
    const expiryHours = Number(expiryHoursByToken[key] ?? "24");
    const nonce = await getSignedListingMinNonce(publicClient, marketAddress, address);
    const expiry =
      Number.isFinite(expiryHours) && expiryHours > 0
        ? BigInt(Math.floor(Date.now() / 1000) + expiryHours * 3600)
        : BigInt(0);

    const listing = buildSignedListingDraft({
      seller: address,
      nftContract: token.collection,
      tokenId: token.tokenId,
      price: parseEther(priceInput),
      expiry,
      nonce,
    });

    const signature = await signSignedListing(walletClient, marketAddress, listing, chainId);

    const currentFeed =
      loadCreatorFeed(chainId, address) ??
      createSignedListingFeed({
        chainId,
        chainName: getChainDisplayName(chainId),
        market: marketAddress,
        creator: address,
        storefrontUrl: `${getAppUrl()}${buildCreatorStorefrontPath(address)}`,
      });

    const published = publishSignedListing({
      feed: currentFeed,
      order: {
        listing,
        signature,
        source: "creator-dashboard",
        publishedAt: Date.now(),
      },
    });

    saveCreatorFeed(published);
    setFeed(published);
    setStatus(`Signed and published token #${token.tokenId.toString()} to local feed.`);
    await refreshSignedState();
  }

  async function previewSigned(token: InventoryToken) {
    if (!publicClient || !marketAddress || !address || !chainId) {
      return;
    }

    const key = `${token.collection}-${token.tokenId.toString()}`;
    const priceInput = signedPriceByToken[key] ?? "0.01";
    const expiryHours = Number(expiryHoursByToken[key] ?? "24");
    const nonce = await getSignedListingMinNonce(publicClient, marketAddress, address);
    const expiry =
      Number.isFinite(expiryHours) && expiryHours > 0
        ? BigInt(Math.floor(Date.now() / 1000) + expiryHours * 3600)
        : BigInt(0);

    const preview = await previewSignedPayouts(
      publicClient,
      marketAddress,
      buildSignedListingDraft({
        seller: address,
        nftContract: token.collection,
        tokenId: token.tokenId,
        price: parseEther(priceInput),
        expiry,
        nonce,
      }),
      BigInt(0)
    );

    setStatus(
      `Preview for #${token.tokenId.toString()}: seller proceeds ${formatEther(preview.sellerProceeds)} ETH, royalty ${formatEther(preview.royaltyAmount)} ETH.`
    );
  }

  function revokeSignedListings() {
    if (!marketAddress) {
      return;
    }

    writeContract({
      address: marketAddress,
      abi: abis.SutrartMarket,
      functionName: "incrementSignedListingNonce",
    });
    setStatus("Revoking all signed listings below current nonce...");
  }

  function removeFromFeed(entry: CreatorSignedListingEntry) {
    if (!feed || !address || !chainId) {
      return;
    }

    const nextFeed = {
      ...feed,
      orders: feed.orders.filter((order) => {
        return !(
          order.listing.nftContract.toLowerCase() === entry.order.listing.nftContract.toLowerCase() &&
          order.listing.tokenId === entry.order.listing.tokenId
        );
      }),
    };

    saveCreatorFeed(nextFeed);
    setFeed(nextFeed);
    setStatus("Removed listing from local feed.");
    void refreshSignedState();
  }

  function pruneStaleFromFeed() {
    if (!feed) {
      return;
    }

    const pruned = pruneStaleSignedListingFeed(feed);
    saveCreatorFeed(pruned);
    setFeed(pruned);
    setStatus("Removed expired listings from local feed.");
    void refreshSignedState();
  }

  function exportFeed() {
    if (!feed) {
      return;
    }

    const blob = new Blob([exportCreatorFeed(feed)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sutrart-feed-${feed.metadata?.creator ?? "creator"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus("Exported feed JSON.");
  }

  function importFeed() {
    if (!address || !chainId) {
      return;
    }

    const imported = importCreatorFeed(importJson);
    saveCreatorFeed(imported);
    setFeed(imported);
    setImportJson("");
    setStatus("Imported feed JSON.");
    void refreshSignedState();
  }

  const activeEntries = useMemo(() => entries.filter((entry) => entry.valid), [entries]);
  const staleEntries = useMemo(
    () => entries.filter((entry) => !entry.valid || entry.expired),
    [entries]
  );

  if (!address || !marketAddress) {
    return null;
  }

  return (
    <section className="space-y-6 rounded-lg border border-border p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">Signed listing syndication</h2>
        <p className="text-sm text-muted-foreground">
          Sign portable listings, publish to your creator feed, and syndicate into storefront and
          marketplace discovery.
        </p>
        {address ? (
          <Link href={buildCreatorStorefrontPath(address)} className="text-sm underline-offset-4 hover:underline">
            View public storefront
          </Link>
        ) : null}
      </div>

      {status ? <p className="text-sm">{status}</p> : null}

      <div className="space-y-3">
        <h3 className="text-base font-medium">Sign unlisted inventory</h3>
        {unlistedTokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No unlisted tokens available to sign.</p>
        ) : (
          <div className="space-y-3">
            {unlistedTokens.map((token) => {
              const key = `${token.collection}-${token.tokenId.toString()}`;
              return (
                <div key={key} className="space-y-3 rounded-lg border border-border p-4">
                  <p className="font-mono text-sm">
                    {token.collection} #{token.tokenId.toString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Price in ETH"
                      value={signedPriceByToken[key] ?? "0.01"}
                      onChange={(event) =>
                        setSignedPriceByToken((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder="Expiry hours (0 = none)"
                      value={expiryHoursByToken[key] ?? "24"}
                      onChange={(event) =>
                        setExpiryHoursByToken((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isBusy || !token.approvedForMarket}
                      onClick={() => void previewSigned(token)}
                    >
                      Preview payouts
                    </Button>
                    <Button
                      type="button"
                      disabled={isBusy || !token.approvedForMarket || !walletClient}
                      onClick={() => void signAndPublish(token)}
                    >
                      Sign and publish
                    </Button>
                  </div>
                  {!token.approvedForMarket ? (
                    <p className="text-xs text-muted-foreground">
                      Approve the marketplace before signing a listing.
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium">Published signed listings</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isBusy} onClick={revokeSignedListings}>
              Revoke via nonce
            </Button>
            <Button type="button" variant="outline" disabled={!feed} onClick={pruneStaleFromFeed}>
              Prune expired
            </Button>
            <Button type="button" variant="outline" disabled={!feed} onClick={exportFeed}>
              Export feed
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="Paste feed JSON to import"
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
          />
          <Button type="button" variant="outline" disabled={!importJson} onClick={importFeed}>
            Import feed JSON
          </Button>
        </div>

        <ListingEntryList title="Active signed listings" entries={activeEntries} onRemove={removeFromFeed} />
        <ListingEntryList title="Expired or stale signed listings" entries={staleEntries} onRemove={removeFromFeed} />
      </div>
    </section>
  );
}

function ListingEntryList({
  title,
  entries,
  onRemove,
}: {
  title: string;
  entries: CreatorSignedListingEntry[];
  onRemove: (entry: CreatorSignedListingEntry) => void;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{title}: none</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {entries.map((entry) => (
        <div key={entry.structHash} className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <p className="font-mono text-xs">{entry.order.listing.nftContract}</p>
          <p>Token #{entry.order.listing.tokenId.toString()}</p>
          <p>Price: {formatEther(entry.order.listing.price)} ETH</p>
          <p>Valid: {entry.valid ? "yes" : "no"}</p>
          <p>Expired: {entry.expired ? "yes" : "no"}</p>
          <div className="flex flex-wrap gap-2">
            <Link href={buildSignedListingPath(entry.structHash)} className="underline-offset-4 hover:underline">
              Canonical listing
            </Link>
            <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => onRemove(entry)}>
              Remove from feed
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
