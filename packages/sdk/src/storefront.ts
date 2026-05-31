import { abis } from "@pari/abi";
import type { Address, PublicClient } from "viem";
import { getAddress, isAddress, zeroAddress } from "viem";
import { getCollectionCreator } from "./collection.js";
import {
  discoverSignedMarketListings,
  getMarketInventory,
  getMarketListingKey,
  getNormalizedListingFields,
  normalizeOnchainListing,
  previewMarketListingPayouts,
  type MarketListing,
  type OnchainMarketListing,
  type SignedListingFeed,
  type SignedListingOrder,
  type SignedMarketListing,
} from "./discovery.js";
import { hashSignedListing } from "./signedListing.js";
import { getCreatorInventory, listingLookupKey, type InventoryToken } from "./inventory.js";
import { getListing, isListingValid, type PayoutPreview } from "./market.js";
import {
  getNormalizedCollectionMetadata,
  getTokenURI,
  type NormalizedCollectionMetadata,
} from "./metadata.js";

export type ListingProvenance = {
  listingType: "onchain" | "signed";
  creator: Address;
  collection: Address;
  tokenId: bigint;
  seller: Address;
  tokenOwner: Address | null;
  royaltyRecipient: Address | null;
  royaltyBps: bigint | null;
  settlementSource: "pari-protocol";
  listingSource: string | null;
  structHash: `0x${string}` | null;
  listingId: bigint | null;
};

export type StorefrontToken = {
  collection: Address;
  tokenId: bigint;
  owner: Address;
  tokenURI: string | null;
  listing: MarketListing | null;
  listingKind: "onchain" | "signed" | null;
  listingValid: boolean;
  price: bigint | null;
  listingSource: string | null;
};

export type CollectionStorefrontSummary = {
  address: Address;
  metadata: NormalizedCollectionMetadata;
  creator: Address;
  tokenCount: number;
  listedCount: number;
};

export type CreatorStorefront = {
  creator: Address;
  collections: CollectionStorefrontSummary[];
  listedTokens: StorefrontToken[];
  unlistedTokens: StorefrontToken[];
  onchainListings: OnchainMarketListing[];
  signedListings: SignedMarketListing[];
};

export type CollectionStorefront = {
  address: Address;
  creator: Address;
  metadata: NormalizedCollectionMetadata;
  royaltyRecipient: Address | null;
  royaltyBps: bigint | null;
  tokens: StorefrontToken[];
  listed: StorefrontToken[];
  unlisted: StorefrontToken[];
};

export type ListingPageData = {
  listing: MarketListing;
  normalized: ReturnType<typeof getNormalizedListingFields>;
  provenance: ListingProvenance;
  payoutPreview: PayoutPreview | null;
  canonicalPath: string;
  valid: boolean;
};

export type StorefrontParams = {
  publicClient: PublicClient;
  marketAddress: Address;
  chainId?: number;
  signedOrders?: SignedListingOrder[];
  signedFeeds?: SignedListingFeed[];
  marketplaceFeeBps?: bigint;
};

export type GetCreatorStorefrontParams = StorefrontParams & { creator: Address };
export type GetCollectionStorefrontParams = StorefrontParams & { collection: Address };

export function buildCreatorStorefrontPath(creator: Address): string {
  return `/creator/${creator.toLowerCase()}`;
}

export function buildCollectionStorefrontPath(collection: Address): string {
  return `/collection/${collection.toLowerCase()}`;
}

export function buildOnchainListingPath(listingId: bigint): string {
  return `/listing/onchain/${listingId.toString()}`;
}

export function buildSignedListingPath(structHash: `0x${string}`): string {
  return `/listing/signed/${structHash.toLowerCase()}`;
}

export function normalizeListingHashParam(value: string): `0x${string}` | null {
  const trimmed = value.trim().toLowerCase();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;

  if (withPrefix.length !== 66) {
    return null;
  }

  return withPrefix as `0x${string}`;
}

export function flattenSignedOrders(
  signedOrders: SignedListingOrder[] = [],
  signedFeeds: SignedListingFeed[] = []
): SignedListingOrder[] {
  return [...signedOrders, ...signedFeeds.flatMap((feed) => feed.orders)];
}

export async function resolveSignedListingByHash(
  publicClient: PublicClient,
  marketAddress: Address,
  structHash: `0x${string}`,
  orders: SignedListingOrder[]
): Promise<SignedMarketListing | null> {
  const normalizedHash = structHash.toLowerCase();

  for (const order of orders) {
    const computedHash = await hashSignedListing(publicClient, marketAddress, order.listing);
    if (computedHash.toLowerCase() !== normalizedHash) {
      continue;
    }

    const [resolved] = await discoverSignedMarketListings(publicClient, marketAddress, [order]);
    return resolved ?? null;
  }

  return null;
}

export async function getTokenRoyaltyInfo(
  publicClient: PublicClient,
  collectionAddress: Address,
  tokenId: bigint,
  referencePrice = 10_000n
): Promise<{ recipient: Address | null; bps: bigint | null }> {
  try {
    const result = await publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "royaltyInfo",
      args: [tokenId, referencePrice],
    });

    const recipient = result[0];
    const amount = result[1];

    if (recipient === zeroAddress || amount === 0n) {
      return { recipient: null, bps: null };
    }

    return {
      recipient,
      bps: (amount * 10_000n) / referencePrice,
    };
  } catch (error) {
    console.warn("[pari] royaltyInfo readContract failed.", {
      collectionAddress,
      tokenId: tokenId.toString(),
      error: error instanceof Error ? error.message : String(error),
    });
    return { recipient: null, bps: null };
  }
}

export async function buildListingProvenance(
  publicClient: PublicClient,
  marketAddress: Address,
  listing: MarketListing
): Promise<ListingProvenance> {
  const normalized = getNormalizedListingFields(listing);
  const creator = await getCollectionCreator(publicClient, marketAddress, normalized.nftContract);

  let tokenOwner: Address | null = null;
  try {
    tokenOwner = await publicClient.readContract({
      address: normalized.nftContract,
      abi: abis.ERC721RT,
      functionName: "ownerOf",
      args: [normalized.tokenId],
    });
  } catch {
    tokenOwner = null;
  }

  const royalty = await getTokenRoyaltyInfo(
    publicClient,
    normalized.nftContract,
    normalized.tokenId
  );

  if (listing.kind === "onchain") {
    return {
      listingType: "onchain",
      creator,
      collection: normalized.nftContract,
      tokenId: normalized.tokenId,
      seller: normalized.seller,
      tokenOwner,
      royaltyRecipient: royalty.recipient,
      royaltyBps: royalty.bps,
      settlementSource: "pari-protocol",
      listingSource: "onchain-protocol",
      structHash: null,
      listingId: listing.listingId,
    };
  }

  return {
    listingType: "signed",
    creator,
    collection: normalized.nftContract,
    tokenId: normalized.tokenId,
    seller: normalized.seller,
    tokenOwner,
    royaltyRecipient: royalty.recipient,
    royaltyBps: royalty.bps,
    settlementSource: "pari-protocol",
    listingSource: listing.source ?? "signed-order",
    structHash: listing.structHash,
    listingId: null,
  };
}

function buildListingIndex(listings: MarketListing[]): Map<string, MarketListing> {
  const index = new Map<string, MarketListing>();

  for (const listing of listings) {
    const normalized = getNormalizedListingFields(listing);
    index.set(normalized.lookupKey, listing);
  }

  return index;
}

function listingSourceLabel(listing: MarketListing): string {
  if (listing.kind === "signed") {
    return listing.source ?? "signed-order";
  }

  return "onchain-protocol";
}

async function inventoryTokenToStorefrontToken(
  publicClient: PublicClient,
  token: InventoryToken,
  listingIndex: Map<string, MarketListing>
): Promise<StorefrontToken> {
  const lookupKey = listingLookupKey(token.collection, token.tokenId);
  const listing = listingIndex.get(lookupKey) ?? null;
  const tokenURI = await getTokenURI(publicClient, token.collection, token.tokenId);

  if (!listing) {
    return {
      collection: token.collection,
      tokenId: token.tokenId,
      owner: token.owner,
      tokenURI,
      listing: null,
      listingKind: null,
      listingValid: false,
      price: null,
      listingSource: null,
    };
  }

  const normalized = getNormalizedListingFields(listing);

  return {
    collection: token.collection,
    tokenId: token.tokenId,
    owner: token.owner,
    tokenURI,
    listing,
    listingKind: listing.kind,
    listingValid: listing.valid,
    price: normalized.price,
    listingSource: listingSourceLabel(listing),
  };
}

async function buildStorefrontTokenFromChain(
  publicClient: PublicClient,
  collectionAddress: Address,
  tokenId: bigint,
  owner: Address,
  listingIndex: Map<string, MarketListing>
): Promise<StorefrontToken> {
  const lookupKey = listingLookupKey(collectionAddress, tokenId);
  const listing = listingIndex.get(lookupKey) ?? null;
  const tokenURI = await getTokenURI(publicClient, collectionAddress, tokenId);

  if (!listing) {
    return {
      collection: collectionAddress,
      tokenId,
      owner,
      tokenURI,
      listing: null,
      listingKind: null,
      listingValid: false,
      price: null,
      listingSource: null,
    };
  }

  const normalized = getNormalizedListingFields(listing);

  return {
    collection: collectionAddress,
    tokenId,
    owner,
    tokenURI,
    listing,
    listingKind: listing.kind,
    listingValid: listing.valid,
    price: normalized.price,
    listingSource: listingSourceLabel(listing),
  };
}

export async function getCreatorStorefront(
  params: GetCreatorStorefrontParams
): Promise<CreatorStorefront> {
  const { publicClient, marketAddress, creator, chainId, signedOrders, signedFeeds } = params;

  if (!isAddress(creator)) {
    throw new Error("creator address is invalid");
  }

  const resolvedCreator = getAddress(creator);

  const [inventory, marketInventory] = await Promise.all([
    getCreatorInventory(publicClient, marketAddress, resolvedCreator),
    getMarketInventory({
      publicClient,
      marketAddress,
      chainId,
      signedOrders,
      signedFeeds,
      conflictPolicy: "include-all",
    }),
  ]);

  const listingIndex = buildListingIndex(
    marketInventory.listings.filter((listing) => listing.valid)
  );

  const listedTokens: StorefrontToken[] = [];
  const unlistedTokens: StorefrontToken[] = [];

  for (const token of inventory.tokens) {
    const storefrontToken = await inventoryTokenToStorefrontToken(
      publicClient,
      token,
      listingIndex
    );

    if (storefrontToken.listingValid) {
      listedTokens.push(storefrontToken);
    } else {
      unlistedTokens.push(storefrontToken);
    }
  }

  const collections: CollectionStorefrontSummary[] = [];

  for (const collection of inventory.collections) {
    const metadata = await getNormalizedCollectionMetadata(publicClient, collection.address);
    const listedCount = collection.tokens.filter((token) => token.listingState.isListed).length;

    collections.push({
      address: collection.address,
      metadata,
      creator: resolvedCreator,
      tokenCount: collection.tokens.length,
      listedCount,
    });
  }

  const onchainListings = marketInventory.onchain.filter(
    (listing) =>
      listing.valid && listing.seller.toLowerCase() === resolvedCreator.toLowerCase()
  );
  const signedListings = marketInventory.signed.filter(
    (listing) =>
      listing.valid && listing.listing.seller.toLowerCase() === resolvedCreator.toLowerCase()
  );

  return {
    creator: resolvedCreator,
    collections,
    listedTokens,
    unlistedTokens,
    onchainListings,
    signedListings,
  };
}

export async function getCollectionStorefront(
  params: GetCollectionStorefrontParams
): Promise<CollectionStorefront> {
  const { publicClient, marketAddress, collection, chainId, signedOrders, signedFeeds } = params;
  const collectionAddress = getAddress(collection);

  const [metadata, creator, nextTokenId, marketInventory] = await Promise.all([
    getNormalizedCollectionMetadata(publicClient, collectionAddress),
    getCollectionCreator(publicClient, marketAddress, collectionAddress),
    publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "nextTokenId",
    }),
    getMarketInventory({
      publicClient,
      marketAddress,
      chainId,
      signedOrders,
      signedFeeds,
      conflictPolicy: "include-all",
    }),
  ]);

  const listingIndex = buildListingIndex(
    marketInventory.listings.filter((listing) => {
      const normalized = getNormalizedListingFields(listing);
      return listing.valid && normalized.nftContract.toLowerCase() === collectionAddress.toLowerCase();
    })
  );

  const tokens: StorefrontToken[] = [];

  for (let tokenId = 1n; tokenId < nextTokenId; tokenId++) {
    let owner: Address;
    try {
      owner = await publicClient.readContract({
        address: collectionAddress,
        abi: abis.ERC721RT,
        functionName: "ownerOf",
        args: [tokenId],
      });
    } catch {
      continue;
    }

    tokens.push(
      await buildStorefrontTokenFromChain(
        publicClient,
        collectionAddress,
        tokenId,
        owner,
        listingIndex
      )
    );
  }

  const royalty =
    tokens.length > 0
      ? await getTokenRoyaltyInfo(publicClient, collectionAddress, tokens[0].tokenId)
      : { recipient: null, bps: null };

  return {
    address: collectionAddress,
    creator,
    metadata,
    royaltyRecipient: royalty.recipient,
    royaltyBps: royalty.bps,
    tokens,
    listed: tokens.filter((token) => token.listingValid),
    unlisted: tokens.filter((token) => !token.listingValid),
  };
}

export async function getListingPageData(
  params: StorefrontParams & {
    kind: "onchain";
    listingId: bigint;
  }
): Promise<ListingPageData | null>;
export async function getListingPageData(
  params: StorefrontParams & {
    kind: "signed";
    structHash: `0x${string}`;
  }
): Promise<ListingPageData | null>;
export async function getListingPageData(
  params: StorefrontParams & {
    kind: "onchain" | "signed";
    listingId?: bigint;
    structHash?: `0x${string}`;
  }
): Promise<ListingPageData | null> {
  const marketplaceFeeBps = params.marketplaceFeeBps ?? 0n;
  const { publicClient, marketAddress } = params;

  if (params.kind === "onchain") {
    if (params.listingId === undefined) {
      return null;
    }

    const listingRecord = await getListing(publicClient, marketAddress, params.listingId);
    const valid = await isListingValid(publicClient, marketAddress, params.listingId);
    const listing = normalizeOnchainListing(listingRecord, valid);
    const provenance = await buildListingProvenance(publicClient, marketAddress, listing);
    const payoutPreview = valid
      ? await previewMarketListingPayouts(
          publicClient,
          marketAddress,
          listing,
          marketplaceFeeBps
        )
      : null;

    return {
      listing,
      normalized: getNormalizedListingFields(listing),
      provenance,
      payoutPreview,
      canonicalPath: buildOnchainListingPath(params.listingId),
      valid,
    };
  }

  if (!params.structHash) {
    return null;
  }

  const orders = flattenSignedOrders(params.signedOrders, params.signedFeeds);
  const listing = await resolveSignedListingByHash(
    publicClient,
    marketAddress,
    params.structHash,
    orders
  );

  if (!listing) {
    return null;
  }

  const provenance = await buildListingProvenance(publicClient, marketAddress, listing);
  const payoutPreview = listing.valid
    ? await previewMarketListingPayouts(
        publicClient,
        marketAddress,
        listing,
        marketplaceFeeBps
      )
    : null;

  return {
    listing,
    normalized: getNormalizedListingFields(listing),
    provenance,
    payoutPreview,
    canonicalPath: buildSignedListingPath(listing.structHash),
    valid: listing.valid,
  };
}

export function getListingPageCanonicalKey(listing: MarketListing): string {
  return getMarketListingKey(listing);
}
