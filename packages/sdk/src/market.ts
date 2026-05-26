import { abis } from "@sutrart/abi";
import type { Address, PublicClient } from "viem";

export type Listing = {
  listingId: bigint;
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  active: boolean;
  createdAt: bigint;
};

export async function getListing(
  publicClient: PublicClient,
  marketAddress: Address,
  listingId: bigint
): Promise<Listing> {
  const result = await publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "listings",
    args: [listingId],
  });

  return {
    listingId: result[0],
    seller: result[1],
    nftContract: result[2],
    tokenId: result[3],
    price: result[4],
    active: result[5],
    createdAt: result[6],
  };
}

export async function isListingValid(
  publicClient: PublicClient,
  marketAddress: Address,
  listingId: bigint
): Promise<boolean> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "isListingValid",
    args: [listingId],
  });
}

export async function getNextListingId(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "nextListingId",
  });
}

export async function getValidListings(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<Listing[]> {
  const nextListingId = await getNextListingId(publicClient, marketAddress);
  const listings: Listing[] = [];

  for (let listingId = 1n; listingId < nextListingId; listingId++) {
    const listing = await getListing(publicClient, marketAddress, listingId);
    if (!listing.active) {
      continue;
    }

    const valid = await isListingValid(publicClient, marketAddress, listingId);
    if (valid) {
      listings.push(listing);
    }
  }

  return listings;
}
