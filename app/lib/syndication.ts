import {
  exportSignedListingFeed,
  importSignedListingFeed,
  mergeSignedFeeds,
  getCreatorFeedStorageKey,
  getMarketplaceFeedUrlsStorageKey,
  type SignedListingFeedV1,
  type SignedListingOrder,
} from "@sutrart/sdk";
import { SUTRART_PROTOCOL_VERSION } from "@sutrart/shared";
import type { Address } from "viem";

const LEGACY_LOCAL_SIGNED_LISTING_FEED_KEY = "sutrart:signed-listing-feed";

export function loadCreatorFeed(chainId: number, creator: Address): SignedListingFeedV1 | null {
  if (typeof window === "undefined") {
    return null;
  }

  migrateLegacyFeed(chainId);

  const raw = window.localStorage.getItem(getCreatorFeedStorageKey(chainId, creator));
  if (!raw) {
    return null;
  }

  try {
    return importSignedListingFeed(JSON.parse(raw));
  } catch (error) {
    console.warn("[sutrart] Failed to parse creator feed JSON.", {
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
    console.warn("[sutrart] Failed to parse marketplace feed URL list from localStorage.", {
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

  const legacy = loadLegacyFeed();
  if (legacy && legacy.chainId === chainId) {
    feeds.push(legacy);
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
        protocolVersion: SUTRART_PROTOCOL_VERSION,
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
      protocolVersion: SUTRART_PROTOCOL_VERSION,
    },
    orders: nextOrders,
  };

  return saveCreatorFeed(nextFeed);
}

function loadLegacyFeed(): SignedListingFeedV1 | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(LEGACY_LOCAL_SIGNED_LISTING_FEED_KEY);
  if (!raw) {
    return null;
  }

  try {
    return importSignedListingFeed(JSON.parse(raw));
  } catch (error) {
    console.warn("[sutrart] Failed to parse legacy signed listing feed JSON.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function migrateLegacyFeed(chainId: number): void {
  const legacy = loadLegacyFeed();
  if (!legacy || legacy.chainId !== chainId) {
    return;
  }

  const creator = legacy.metadata?.creator ?? legacy.orders[0]?.listing.seller;
  if (!creator || loadCreatorFeed(chainId, creator)) {
    return;
  }

  saveCreatorFeed(legacy);
}

export { LEGACY_LOCAL_SIGNED_LISTING_FEED_KEY };
