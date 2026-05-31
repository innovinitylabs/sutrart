import {
  exportSignedListingFeed,
  importSignedListingFeed,
  mergeSignedFeeds,
  getCreatorFeedStorageKey,
  getMarketplaceFeedUrlsStorageKey,
  type SignedListingFeedV1,
  type SignedListingOrder,
} from "@pari/sdk";
import { PARI_PROTOCOL_VERSION } from "@pari/shared";
import type { Address } from "viem";

export function loadCreatorFeed(chainId: number, creator: Address): SignedListingFeedV1 | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(getCreatorFeedStorageKey(chainId, creator));
  if (!raw) {
    return null;
  }

  try {
    return importSignedListingFeed(JSON.parse(raw));
  } catch (error) {
    console.warn("[pari] Failed to parse creator feed JSON.", {
      chainId,
      creator,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function saveCreatorFeed(feed: SignedListingFeedV1): SignedListingFeedV1 {
  if (typeof window === "undefined") {
    throw new Error("Creator feeds can only be saved in the browser");
  }

  const creator = feed.metadata?.creator ?? feed.orders[0]?.listing.seller;
  if (!creator) {
    throw new Error("Creator feed requires metadata.creator or at least one order");
  }

  const serialized = exportSignedListingFeed(feed);
  window.localStorage.setItem(
    getCreatorFeedStorageKey(feed.chainId, creator),
    serialized
  );

  return feed;
}

export function loadMarketplaceFeedUrls(chainId: number): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(getMarketplaceFeedUrlsStorageKey(chainId));
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
  } catch (error) {
    console.warn("[pari] Failed to parse marketplace feed URL list from localStorage.", {
      chainId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export function saveMarketplaceFeedUrls(chainId: number, urls: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getMarketplaceFeedUrlsStorageKey(chainId), JSON.stringify(urls));
}

export function loadAllLocalFeeds(chainId: number, creator?: Address): SignedListingFeedV1[] {
  const feeds: SignedListingFeedV1[] = [];

  if (creator) {
    const creatorFeed = loadCreatorFeed(chainId, creator);
    if (creatorFeed) {
      feeds.push(creatorFeed);
    }
  }

  return feeds;
}

export function mergeLocalFeeds(feeds: SignedListingFeedV1[]): SignedListingFeedV1 | null {
  if (feeds.length === 0) {
    return null;
  }

  if (feeds.length === 1) {
    return feeds[0];
  }

  return mergeSignedFeeds(feeds);
}

export function exportCreatorFeed(feed: SignedListingFeedV1): string {
  return exportSignedListingFeed(feed);
}

export function importCreatorFeed(json: string): SignedListingFeedV1 {
  return importSignedListingFeed(JSON.parse(json));
}

export function appendOrderToCreatorFeed(
  chainId: number,
  creator: Address,
  market: Address,
  order: SignedListingOrder,
  chainName: string,
  storefrontUrl?: string
): SignedListingFeedV1 {
  const existing =
    loadCreatorFeed(chainId, creator) ??
    ({
      version: 1,
      chainId,
      chainName,
      market,
      metadata: {
        creator,
        storefrontUrl,
        generatedAt: Date.now(),
        chainId,
        protocolVersion: PARI_PROTOCOL_VERSION,
      },
      orders: [],
    } satisfies SignedListingFeedV1);

  const nextOrders = existing.orders.filter((entry) => {
    return !(
      entry.listing.nftContract.toLowerCase() === order.listing.nftContract.toLowerCase() &&
      entry.listing.tokenId === order.listing.tokenId
    );
  });
  nextOrders.push(order);

  const nextFeed: SignedListingFeedV1 = {
    ...existing,
    metadata: {
      creator,
      storefrontUrl: existing.metadata?.storefrontUrl ?? storefrontUrl,
      generatedAt: Date.now(),
      chainId,
      protocolVersion: PARI_PROTOCOL_VERSION,
    },
    orders: nextOrders,
  };

  return saveCreatorFeed(nextFeed);
}
