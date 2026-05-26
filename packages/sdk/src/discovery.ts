import type { Address, PublicClient } from "viem";
import { getAddress, isAddress } from "viem";
import { listingLookupKey } from "./inventory";
import {
  getValidListings,
  previewPayouts,
  type Listing,
  type PayoutPreview,
} from "./market";
import {
  hashSignedListing,
  isSignedListingValid,
  previewSignedPayouts,
  type SignedListing,
} from "./signedListing";

export type ListingConflictPolicy = "prefer-onchain" | "prefer-signed" | "include-all";

export type NormalizedListingFields = {
  kind: "onchain" | "signed";
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  valid: boolean;
  lookupKey: string;
};

export type OnchainMarketListing = {
  kind: "onchain";
  listingId: bigint;
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  active: boolean;
  createdAt: bigint;
  valid: boolean;
};

export type SignedListingOrder = {
  listing: SignedListing;
  signature: `0x${string}`;
  source?: string;
  publishedAt?: number;
};

export type SignedMarketListing = {
  kind: "signed";
  listing: SignedListing;
  signature: `0x${string}`;
  structHash: `0x${string}`;
  valid: boolean;
  source?: string;
  publishedAt?: number;
};

export type MarketListing = OnchainMarketListing | SignedMarketListing;

export type SignedListingFeed = {
  version: 1;
  chainId: number;
  chainName?: string;
  market: Address;
  metadata?: {
    creator: Address;
    storefrontUrl?: string;
    generatedAt: number;
    chainId: number;
    protocolVersion: string;
  };
  orders: SignedListingOrder[];
};

export type MarketInventory = {
  listings: MarketListing[];
  onchain: OnchainMarketListing[];
  signed: SignedMarketListing[];
  totalCount: number;
  validCount: number;
};

export type DiscoverMarketInventoryParams = {
  publicClient: PublicClient;
  marketAddress: Address;
  chainId?: number;
  signedOrders?: SignedListingOrder[];
  signedFeeds?: SignedListingFeed[];
  conflictPolicy?: ListingConflictPolicy;
};

export function normalizeOnchainListing(listing: Listing, valid = true): OnchainMarketListing {
  return {
    kind: "onchain",
    listingId: listing.listingId,
    seller: listing.seller,
    nftContract: listing.nftContract,
    tokenId: listing.tokenId,
    price: listing.price,
    active: listing.active,
    createdAt: listing.createdAt,
    valid,
  };
}

export function normalizeSignedListingOrder(
  order: SignedListingOrder,
  structHash: `0x${string}`,
  valid: boolean
): SignedMarketListing {
  return {
    kind: "signed",
    listing: order.listing,
    signature: order.signature,
    structHash,
    valid,
    source: order.source,
    publishedAt: order.publishedAt,
  };
}

export function getNormalizedListingFields(listing: MarketListing): NormalizedListingFields {
  if (listing.kind === "onchain") {
    return {
      kind: "onchain",
      seller: listing.seller,
      nftContract: listing.nftContract,
      tokenId: listing.tokenId,
      price: listing.price,
      valid: listing.valid,
      lookupKey: listingLookupKey(listing.nftContract, listing.tokenId),
    };
  }

  return {
    kind: "signed",
    seller: listing.listing.seller,
    nftContract: listing.listing.nftContract,
    tokenId: listing.listing.tokenId,
    price: listing.listing.price,
    valid: listing.valid,
    lookupKey: listingLookupKey(listing.listing.nftContract, listing.listing.tokenId),
  };
}

export function getMarketListingKey(listing: MarketListing): string {
  if (listing.kind === "onchain") {
    return `onchain:${listing.listingId.toString()}`;
  }

  return `signed:${listing.structHash}`;
}

export function filterValidMarketListings(listings: MarketListing[]): MarketListing[] {
  return listings.filter((listing) => listing.valid);
}

export function filterMarketListingsByCollection(
  listings: MarketListing[],
  nftContract: Address
): MarketListing[] {
  const normalizedContract = nftContract.toLowerCase();

  return listings.filter(
    (listing) => getNormalizedListingFields(listing).nftContract.toLowerCase() === normalizedContract
  );
}

export function filterMarketListingsBySeller(
  listings: MarketListing[],
  seller: Address
): MarketListing[] {
  const normalizedSeller = seller.toLowerCase();

  return listings.filter(
    (listing) => getNormalizedListingFields(listing).seller.toLowerCase() === normalizedSeller
  );
}

export async function discoverOnchainMarketListings(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<OnchainMarketListing[]> {
  const listings = await getValidListings(publicClient, marketAddress);
  return listings.map((listing) => normalizeOnchainListing(listing, true));
}

export async function discoverSignedMarketListings(
  publicClient: PublicClient,
  marketAddress: Address,
  orders: SignedListingOrder[]
): Promise<SignedMarketListing[]> {
  const discovered: SignedMarketListing[] = [];

  await Promise.all(
    orders.map(async (order) => {
      const [structHash, valid] = await Promise.all([
        hashSignedListing(publicClient, marketAddress, order.listing),
        isSignedListingValid(publicClient, marketAddress, order.listing),
      ]);

      discovered.push(normalizeSignedListingOrder(order, structHash, valid));
    })
  );

  return discovered;
}

export function mergeMarketListings(
  onchain: OnchainMarketListing[],
  signed: SignedMarketListing[],
  conflictPolicy: ListingConflictPolicy = "prefer-onchain"
): MarketListing[] {
  if (conflictPolicy === "include-all") {
    return [...onchain, ...signed];
  }

  const onchainByToken = new Map<string, OnchainMarketListing>();
  for (const listing of onchain) {
    onchainByToken.set(listingLookupKey(listing.nftContract, listing.tokenId), listing);
  }

  const signedByToken = new Map<string, SignedMarketListing>();
  for (const listing of signed) {
    signedByToken.set(
      listingLookupKey(listing.listing.nftContract, listing.listing.tokenId),
      listing
    );
  }

  const tokenKeys = new Set<string>([...onchainByToken.keys(), ...signedByToken.keys()]);
  const merged: MarketListing[] = [];

  for (const tokenKey of tokenKeys) {
    const onchainListing = onchainByToken.get(tokenKey);
    const signedListing = signedByToken.get(tokenKey);

    if (onchainListing && signedListing) {
      if (conflictPolicy === "prefer-signed") {
        merged.push(signedListing);
      } else {
        merged.push(onchainListing);
      }
      continue;
    }

    if (onchainListing) {
      merged.push(onchainListing);
      continue;
    }

    if (signedListing) {
      merged.push(signedListing);
    }
  }

  return merged;
}

export function flattenSignedListingFeeds(feeds: SignedListingFeed[]): SignedListingOrder[] {
  const orders: SignedListingOrder[] = [];

  for (const feed of feeds) {
    for (const order of feed.orders) {
      orders.push({
        ...order,
        source: order.source ?? `${feed.market}:${feed.chainId}`,
      });
    }
  }

  return orders;
}

export function parseSignedListingFeed(input: unknown): SignedListingFeed {
  if (!input || typeof input !== "object") {
    throw new Error("Signed listing feed must be an object");
  }

  const feed = input as Partial<SignedListingFeed>;

  if (feed.version !== 1) {
    throw new Error("Unsupported signed listing feed version");
  }

  if (typeof feed.chainId !== "number") {
    throw new Error("Signed listing feed chainId is required");
  }

  if (!feed.market || !isAddress(feed.market)) {
    throw new Error("Signed listing feed market address is invalid");
  }

  if (!Array.isArray(feed.orders)) {
    throw new Error("Signed listing feed orders must be an array");
  }

  return {
    version: 1,
    chainId: feed.chainId,
    chainName: typeof feed.chainName === "string" ? feed.chainName : undefined,
    market: getAddress(feed.market),
    metadata: parseFeedMetadata(feed.metadata, feed.chainId),
    orders: feed.orders.map(parseSignedListingOrder),
  };
}

type FeedMetadataInput = {
  creator?: unknown;
  storefrontUrl?: unknown;
  generatedAt?: unknown;
  chainId?: unknown;
  protocolVersion?: unknown;
};

function parseFeedMetadata(
  input: unknown,
  chainId: number
): SignedListingFeed["metadata"] | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const metadata = input as FeedMetadataInput;

  if (!metadata.creator || !isAddress(String(metadata.creator))) {
    return undefined;
  }

  if (typeof metadata.generatedAt !== "number") {
    return undefined;
  }

  if (typeof metadata.protocolVersion !== "string") {
    return undefined;
  }

  return {
    creator: getAddress(String(metadata.creator)),
    storefrontUrl:
      typeof metadata.storefrontUrl === "string" ? metadata.storefrontUrl : undefined,
    generatedAt: metadata.generatedAt,
    chainId: typeof metadata.chainId === "number" ? metadata.chainId : chainId,
    protocolVersion: metadata.protocolVersion,
  };
}

export function serializeSignedListingFeed(feed: SignedListingFeed): string {
  return JSON.stringify(
    feed,
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  );
}

export async function fetchSignedListingFeed(url: string): Promise<SignedListingFeed> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch signed listing feed (${response.status})`);
  }

  const json: unknown = await response.json();
  return parseSignedListingFeed(json);
}

export async function getMarketInventory(
  params: DiscoverMarketInventoryParams
): Promise<MarketInventory> {
  const {
    publicClient,
    marketAddress,
    chainId,
    signedOrders = [],
    signedFeeds = [],
    conflictPolicy = "prefer-onchain",
  } = params;

  const syndicatedOrders = [...signedOrders, ...flattenSignedListingFeeds(signedFeeds)];

  if (chainId !== undefined) {
    for (const feed of signedFeeds) {
      if (feed.chainId !== chainId) {
        throw new Error("Signed listing feed chainId does not match discovery chainId");
      }

      if (feed.market.toLowerCase() !== marketAddress.toLowerCase()) {
        throw new Error("Signed listing feed market does not match discovery market");
      }
    }
  }

  const [onchain, signed] = await Promise.all([
    discoverOnchainMarketListings(publicClient, marketAddress),
    discoverSignedMarketListings(publicClient, marketAddress, syndicatedOrders),
  ]);

  const listings = mergeMarketListings(onchain, signed, conflictPolicy);
  const validCount = listings.filter((listing) => listing.valid).length;

  return {
    listings,
    onchain,
    signed,
    totalCount: listings.length,
    validCount,
  };
}

export async function previewMarketListingPayouts(
  publicClient: PublicClient,
  marketAddress: Address,
  listing: MarketListing,
  marketplaceFeeBps: bigint
): Promise<PayoutPreview> {
  if (listing.kind === "onchain") {
    return previewPayouts(publicClient, marketAddress, listing.listingId, marketplaceFeeBps);
  }

  return previewSignedPayouts(publicClient, marketAddress, listing.listing, marketplaceFeeBps);
}

function parseSignedListingOrder(input: unknown): SignedListingOrder {
  if (!input || typeof input !== "object") {
    throw new Error("Signed listing order must be an object");
  }

  const order = input as Partial<SignedListingOrder>;

  if (!order.listing) {
    throw new Error("Signed listing order is missing listing");
  }

  if (!order.signature || typeof order.signature !== "string" || !order.signature.startsWith("0x")) {
    throw new Error("Signed listing order signature is invalid");
  }

  return {
    listing: parseSignedListing(order.listing),
    signature: order.signature as `0x${string}`,
    source: typeof order.source === "string" ? order.source : undefined,
    publishedAt: typeof order.publishedAt === "number" ? order.publishedAt : undefined,
  };
}

function parseSignedListing(input: unknown): SignedListing {
  if (!input || typeof input !== "object") {
    throw new Error("Signed listing must be an object");
  }

  const listing = input as Partial<Record<keyof SignedListing, unknown>>;

  if (!listing.seller || !isAddress(String(listing.seller))) {
    throw new Error("Signed listing seller is invalid");
  }

  if (!listing.nftContract || !isAddress(String(listing.nftContract))) {
    throw new Error("Signed listing nftContract is invalid");
  }

  return {
    seller: getAddress(String(listing.seller)),
    nftContract: getAddress(String(listing.nftContract)),
    tokenId: parseBigIntField(listing.tokenId, "tokenId"),
    price: parseBigIntField(listing.price, "price"),
    expiry: parseBigIntField(listing.expiry, "expiry"),
    nonce: parseBigIntField(listing.nonce, "nonce"),
  };
}

function parseBigIntField(value: unknown, field: string): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number" && Number.isInteger(value)) {
    return BigInt(value);
  }

  if (typeof value === "string" && value.length > 0) {
    return BigInt(value);
  }

  throw new Error(`Signed listing ${field} is invalid`);
}
