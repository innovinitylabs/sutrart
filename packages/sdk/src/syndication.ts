import type { Address, PublicClient } from "viem";
import { getAddress, isAddress, zeroAddress } from "viem";
import { listingLookupKey } from "./inventory";
import {
  discoverSignedMarketListings,
  parseSignedListingFeed,
  serializeSignedListingFeed,
  type SignedListingFeed,
  type SignedListingOrder,
  type SignedMarketListing,
} from "./discovery";
import { hashSignedListing, isSignedListingValid, type SignedListing } from "./signedListing";

export const SIGNED_LISTING_FEED_VERSION = 1 as const;
export const SUTRART_PROTOCOL_VERSION = "1" as const;

export type SignedListingFeedMetadata = {
  creator: Address;
  storefrontUrl?: string;
  generatedAt: number;
  chainId: number;
  protocolVersion: string;
};

export type SignedListingFeedV1 = SignedListingFeed & {
  chainName?: string;
  metadata?: SignedListingFeedMetadata;
};

export type SignedFeedValidationIssue = {
  path: string;
  message: string;
};

export type SignedFeedValidationResult = {
  valid: boolean;
  issues: SignedFeedValidationIssue[];
};

export type CreatorSignedListingEntry = {
  order: SignedListingOrder;
  structHash: `0x${string}`;
  valid: boolean;
  expired: boolean;
  filled: boolean;
  lookupKey: string;
};

export type PublishSignedListingParams = {
  feed: SignedListingFeedV1;
  order: SignedListingOrder;
};

export type CreateSignedListingFeedParams = {
  chainId: number;
  chainName: string;
  market: Address;
  creator: Address;
  storefrontUrl?: string;
};

export function createSignedListingFeed(params: CreateSignedListingFeedParams): SignedListingFeedV1 {
  return {
    version: SIGNED_LISTING_FEED_VERSION,
    chainId: params.chainId,
    chainName: params.chainName,
    market: getAddress(params.market),
    metadata: {
      creator: getAddress(params.creator),
      storefrontUrl: params.storefrontUrl,
      generatedAt: Date.now(),
      chainId: params.chainId,
      protocolVersion: SUTRART_PROTOCOL_VERSION,
    },
    orders: [],
  };
}

export function buildSignedListingDraft(params: {
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  expiry: bigint;
  nonce: bigint;
}): SignedListing {
  return {
    seller: getAddress(params.seller),
    nftContract: getAddress(params.nftContract),
    tokenId: params.tokenId,
    price: params.price,
    expiry: params.expiry,
    nonce: params.nonce,
  };
}

export function publishSignedListing(params: PublishSignedListingParams): SignedListingFeedV1 {
  validateSignedFeed(params.feed);

  const lookupKey = listingLookupKey(
    params.order.listing.nftContract,
    params.order.listing.tokenId
  );

  const nextOrders = params.feed.orders.filter((entry) => {
    return listingLookupKey(entry.listing.nftContract, entry.listing.tokenId) !== lookupKey;
  });

  nextOrders.push({
    ...params.order,
    publishedAt: params.order.publishedAt ?? Date.now(),
    source: params.order.source ?? "creator-feed",
  });

  return {
    ...params.feed,
    metadata: {
      creator: params.feed.metadata?.creator ?? params.order.listing.seller,
      storefrontUrl: params.feed.metadata?.storefrontUrl,
      generatedAt: Date.now(),
      chainId: params.feed.chainId,
      protocolVersion: params.feed.metadata?.protocolVersion ?? SUTRART_PROTOCOL_VERSION,
    },
    orders: nextOrders,
  };
}

export function removeSignedListingFromFeed(
  feed: SignedListingFeedV1,
  nftContract: Address,
  tokenId: bigint
): SignedListingFeedV1 {
  return removeSignedListingFromFeedByLookupKey(feed, nftContract, tokenId);
}

export function removeSignedListingFromFeedByLookupKey(
  feed: SignedListingFeedV1,
  nftContract: Address,
  tokenId: bigint
): SignedListingFeedV1 {
  const lookupKey = listingLookupKey(nftContract, tokenId);

  return {
    ...feed,
    orders: feed.orders.filter((entry) => {
      return listingLookupKey(entry.listing.nftContract, entry.listing.tokenId) !== lookupKey;
    }),
  };
}

export function mergeSignedFeeds(
  feeds: SignedListingFeedV1[],
  chainId?: number,
  market?: Address
): SignedListingFeedV1 {
  if (feeds.length === 0) {
    throw new Error("At least one feed is required to merge");
  }

  const [first, ...rest] = feeds;
  const resolvedChainId = chainId ?? first.chainId;
  const resolvedMarket = market ? getAddress(market) : first.market;

  const orderIndex = new Map<string, SignedListingOrder>();

  for (const feed of [first, ...rest]) {
    if (feed.chainId !== resolvedChainId) {
      throw new Error("Cannot merge feeds with different chainId values");
    }

    if (feed.market.toLowerCase() !== resolvedMarket.toLowerCase()) {
      throw new Error("Cannot merge feeds with different market addresses");
    }

    for (const order of feed.orders) {
      const key = listingLookupKey(order.listing.nftContract, order.listing.tokenId);
      orderIndex.set(key, {
        ...order,
        source: order.source ?? feed.metadata?.storefrontUrl ?? "merged-feed",
      });
    }
  }

  return {
    version: SIGNED_LISTING_FEED_VERSION,
    chainId: resolvedChainId,
    chainName: first.chainName,
    market: resolvedMarket,
    metadata: {
      creator: first.metadata?.creator ?? first.orders[0]?.listing.seller ?? zeroAddress,
      storefrontUrl: first.metadata?.storefrontUrl,
      generatedAt: Date.now(),
      chainId: resolvedChainId,
      protocolVersion: SUTRART_PROTOCOL_VERSION,
    },
    orders: [...orderIndex.values()],
  };
}

export function validateSignedFeed(input: unknown): SignedFeedValidationResult {
  const issues: SignedFeedValidationIssue[] = [];

  try {
    const feed = parseSignedListingFeed(input) as SignedListingFeedV1;

    if (feed.version !== SIGNED_LISTING_FEED_VERSION) {
      issues.push({ path: "version", message: "Unsupported feed version" });
    }

    if (feed.metadata) {
      if (!isAddress(feed.metadata.creator)) {
        issues.push({ path: "metadata.creator", message: "Creator address is invalid" });
      }

      if (feed.metadata.chainId !== feed.chainId) {
        issues.push({
          path: "metadata.chainId",
          message: "metadata.chainId must match feed.chainId",
        });
      }

      if (feed.metadata.protocolVersion !== SUTRART_PROTOCOL_VERSION) {
        issues.push({
          path: "metadata.protocolVersion",
          message: "Unsupported protocol version in metadata",
        });
      }
    }

    const lookupKeys = new Set<string>();
    for (const [index, order] of feed.orders.entries()) {
      const key = listingLookupKey(order.listing.nftContract, order.listing.tokenId);
      if (lookupKeys.has(key)) {
        issues.push({
          path: `orders[${index}]`,
          message: "Duplicate token listing in feed",
        });
      }
      lookupKeys.add(key);
    }

    return { valid: issues.length === 0, issues };
  } catch (error) {
    issues.push({
      path: "feed",
      message: error instanceof Error ? error.message : "Invalid signed listing feed",
    });
    return { valid: false, issues };
  }
}

export function importSignedListingFeed(json: unknown): SignedListingFeedV1 {
  const feed = parseSignedListingFeed(json) as SignedListingFeedV1;
  const validation = validateSignedFeed(feed);
  if (!validation.valid) {
    throw new Error(validation.issues.map((issue) => issue.message).join("; "));
  }
  return feed;
}

export function exportSignedListingFeed(feed: SignedListingFeedV1): string {
  validateSignedFeed(feed);
  return serializeSignedListingFeed(feed);
}

export function isSignedListingExpired(listing: SignedListing, nowSeconds = BigInt(Math.floor(Date.now() / 1000))): boolean {
  return listing.expiry !== 0n && listing.expiry < nowSeconds;
}

export async function getCreatorSignedListings(
  publicClient: PublicClient,
  marketAddress: Address,
  creator: Address,
  feeds: SignedListingFeedV1[]
): Promise<CreatorSignedListingEntry[]> {
  const creatorLower = creator.toLowerCase();
  const merged = mergeSignedFeeds(feeds).orders.filter(
    (order) => order.listing.seller.toLowerCase() === creatorLower
  );

  const discovered = await discoverSignedMarketListings(publicClient, marketAddress, merged);
  const discoveredByLookup = new Map<string, SignedMarketListing>();

  for (const listing of discovered) {
    discoveredByLookup.set(
      listingLookupKey(listing.listing.nftContract, listing.listing.tokenId),
      listing
    );
  }

  const entries: CreatorSignedListingEntry[] = [];

  for (const order of merged) {
    const lookupKey = listingLookupKey(order.listing.nftContract, order.listing.tokenId);
    const structHash = await hashSignedListing(publicClient, marketAddress, order.listing);
    const valid = await isSignedListingValid(publicClient, marketAddress, order.listing);
    const expired = isSignedListingExpired(order.listing);
    const discoveredListing = discoveredByLookup.get(lookupKey);

    entries.push({
      order,
      structHash,
      valid,
      expired,
      filled: discoveredListing ? !discoveredListing.valid && !expired : false,
      lookupKey,
    });
  }

  return entries;
}

export function pruneStaleSignedListingFeed(feed: SignedListingFeedV1, nowSeconds = BigInt(Math.floor(Date.now() / 1000))): SignedListingFeedV1 {
  return {
    ...feed,
    orders: feed.orders.filter((order) => !isSignedListingExpired(order.listing, nowSeconds)),
  };
}

export function buildRevokeSignedListingsTransaction(marketAddress: Address) {
  return {
    address: marketAddress,
    functionName: "incrementSignedListingNonce" as const,
  };
}

export function revokeSignedListings(marketAddress: Address) {
  return buildRevokeSignedListingsTransaction(marketAddress);
}

export function getCreatorFeedStorageKey(chainId: number, creator: Address): string {
  return `sutrart:creator-feed:${chainId}:${creator.toLowerCase()}`;
}

export function getMarketplaceFeedUrlsStorageKey(chainId: number): string {
  return `sutrart:marketplace-feed-urls:${chainId}`;
}
