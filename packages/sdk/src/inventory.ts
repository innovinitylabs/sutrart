import { abis } from "@pari/abi";
import type { Address, PublicClient } from "viem";
import {
  getCollectionOwnedTokenIds,
  getCreatorCollections,
} from "./collection.js";
import {
  getListing,
  getNextListingId,
  isListingValid,
  type Listing,
} from "./market.js";

export type TokenListingState = {
  isListed: boolean;
  listingId: bigint | null;
  listingActive: boolean;
  listingValid: boolean;
  price: bigint | null;
};

export type InventoryToken = {
  collection: Address;
  tokenId: bigint;
  owner: Address;
  approvedForMarket: boolean;
  listingState: TokenListingState;
};

export type InventoryCollection = {
  address: Address;
  name: string;
  symbol: string;
  tokens: InventoryToken[];
};

export type CreatorInventory = {
  creator: Address;
  collections: InventoryCollection[];
  tokens: InventoryToken[];
  listed: InventoryToken[];
  unlisted: InventoryToken[];
};

export function listingLookupKey(nftContract: Address, tokenId: bigint): string {
  return `${nftContract.toLowerCase()}-${tokenId.toString()}`;
}

export async function getSellerListings(
  publicClient: PublicClient,
  marketAddress: Address,
  seller: Address
): Promise<Listing[]> {
  const nextListingId = await getNextListingId(publicClient, marketAddress);
  const listings: Listing[] = [];

  for (let listingId = 1n; listingId < nextListingId; listingId++) {
    const listing = await getListing(publicClient, marketAddress, listingId);
    if (listing.seller.toLowerCase() === seller.toLowerCase()) {
      listings.push(listing);
    }
  }

  return listings;
}

export function buildActiveListingIndex(listings: Listing[]): Map<string, Listing> {
  const index = new Map<string, Listing>();

  for (const listing of listings) {
    if (!listing.active) {
      continue;
    }

    index.set(listingLookupKey(listing.nftContract, listing.tokenId), listing);
  }

  return index;
}

export async function getTokenListingState(
  publicClient: PublicClient,
  marketAddress: Address,
  nftContract: Address,
  tokenId: bigint,
  activeListingIndex?: Map<string, Listing>
): Promise<TokenListingState> {
  const listing =
    activeListingIndex?.get(listingLookupKey(nftContract, tokenId)) ?? null;

  if (!listing) {
    return {
      isListed: false,
      listingId: null,
      listingActive: false,
      listingValid: false,
      price: null,
    };
  }

  const listingValid = await isListingValid(publicClient, marketAddress, listing.listingId);

  return {
    isListed: listing.active && listingValid,
    listingId: listing.listingId,
    listingActive: listing.active,
    listingValid,
    price: listing.price,
  };
}

async function isTokenApprovedForMarket(
  publicClient: PublicClient,
  collectionAddress: Address,
  marketAddress: Address,
  owner: Address,
  tokenId: bigint
): Promise<boolean> {
  const approved = await publicClient.readContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "getApproved",
    args: [tokenId],
  });

  if (approved.toLowerCase() === marketAddress.toLowerCase()) {
    return true;
  }

  return publicClient.readContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "isApprovedForAll",
    args: [owner, marketAddress],
  });
}

async function getCollectionMetadata(
  publicClient: PublicClient,
  collectionAddress: Address
): Promise<{ name: string; symbol: string }> {
  const [name, symbol] = await Promise.all([
    publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "name",
    }),
    publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "symbol",
    }),
  ]);

  return { name, symbol };
}

export async function getCollectionTokens(
  publicClient: PublicClient,
  marketAddress: Address,
  collectionAddress: Address,
  owner: Address,
  activeListingIndex?: Map<string, Listing>
): Promise<InventoryToken[]> {
  const tokenIds = await getCollectionOwnedTokenIds(publicClient, collectionAddress, owner);
  const tokens: InventoryToken[] = [];

  for (const tokenId of tokenIds) {
    const [approvedForMarket, listingState] = await Promise.all([
      isTokenApprovedForMarket(publicClient, collectionAddress, marketAddress, owner, tokenId),
      getTokenListingState(publicClient, marketAddress, collectionAddress, tokenId, activeListingIndex),
    ]);

    tokens.push({
      collection: collectionAddress,
      tokenId,
      owner,
      approvedForMarket,
      listingState,
    });
  }

  return tokens;
}

export async function getCreatorInventory(
  publicClient: PublicClient,
  marketAddress: Address,
  creator: Address
): Promise<CreatorInventory> {
  const [collectionAddresses, sellerListings] = await Promise.all([
    getCreatorCollections(publicClient, marketAddress, creator),
    getSellerListings(publicClient, marketAddress, creator),
  ]);

  const activeListingIndex = buildActiveListingIndex(sellerListings);
  const collections: InventoryCollection[] = [];
  const tokens: InventoryToken[] = [];

  for (const collectionAddress of collectionAddresses) {
    const [metadata, collectionTokens] = await Promise.all([
      getCollectionMetadata(publicClient, collectionAddress),
      getCollectionTokens(
        publicClient,
        marketAddress,
        collectionAddress,
        creator,
        activeListingIndex
      ),
    ]);

    collections.push({
      address: collectionAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      tokens: collectionTokens,
    });
    tokens.push(...collectionTokens);
  }

  const listed = tokens.filter((token) => token.listingState.isListed);
  const unlisted = tokens.filter((token) => !token.listingState.isListed);

  return {
    creator,
    collections,
    tokens,
    listed,
    unlisted,
  };
}
