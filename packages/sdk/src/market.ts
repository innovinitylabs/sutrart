import { abis } from "@pari/abi";
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

export type PayoutPreview = {
  grossPrice: bigint;
  protocolFee: bigint;
  marketplaceFee: bigint;
  royaltyAmount: bigint;
  royaltyRecipient: Address;
  sellerProceeds: bigint;
};

export async function getListing(
  publicClient: PublicClient,
  marketAddress: Address,
  listingId: bigint
): Promise<Listing> {
  const result = await publicClient.readContract({
    address: marketAddress,
    abi: abis.PariMarket,
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
    abi: abis.PariMarket,
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
    abi: abis.PariMarket,
    functionName: "nextListingId",
  });
}

export async function getAllListings(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<Listing[]> {
  const nextListingId = await getNextListingId(publicClient, marketAddress);
  const listings: Listing[] = [];

  for (let listingId = 1n; listingId < nextListingId; listingId++) {
    listings.push(await getListing(publicClient, marketAddress, listingId));
  }

  return listings;
}

export async function getValidListings(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<Listing[]> {
  const listings = await getAllListings(publicClient, marketAddress);
  const validListings: Listing[] = [];

  for (const listing of listings) {
    if (!listing.active) {
      continue;
    }

    const valid = await isListingValid(publicClient, marketAddress, listing.listingId);
    if (valid) {
      validListings.push(listing);
    }
  }

  return validListings;
}

export type ProtocolFeeConfig = {
  protocolFeeBps: bigint;
  protocolTreasury: Address;
  maxProtocolFeeBps: bigint;
  maxMarketplaceFeeBps: bigint;
};

export async function getProtocolFeeConfig(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<ProtocolFeeConfig> {
  const [protocolFeeBps, protocolTreasury, maxProtocolFeeBps, maxMarketplaceFeeBps] =
    await Promise.all([
      publicClient.readContract({
        address: marketAddress,
        abi: abis.PariMarket,
        functionName: "protocolFeeBps",
      }),
      publicClient.readContract({
        address: marketAddress,
        abi: abis.PariMarket,
        functionName: "protocolTreasury",
      }),
      publicClient.readContract({
        address: marketAddress,
        abi: abis.PariMarket,
        functionName: "MAX_PROTOCOL_FEE_BPS",
      }),
      publicClient.readContract({
        address: marketAddress,
        abi: abis.PariMarket,
        functionName: "MAX_MARKETPLACE_FEE_BPS",
      }),
    ]);

  return {
    protocolFeeBps,
    protocolTreasury,
    maxProtocolFeeBps,
    maxMarketplaceFeeBps,
  };
}

export async function previewPayouts(
  publicClient: PublicClient,
  marketAddress: Address,
  listingId: bigint,
  marketplaceFeeBps: bigint
): Promise<PayoutPreview> {
  const result = await publicClient.readContract({
    address: marketAddress,
    abi: abis.PariMarket,
    functionName: "previewPayouts",
    args: [listingId, marketplaceFeeBps],
  });

  return {
    grossPrice: result.grossPrice,
    protocolFee: result.protocolFee,
    marketplaceFee: result.marketplaceFee,
    royaltyAmount: result.royaltyAmount,
    royaltyRecipient: result.royaltyRecipient,
    sellerProceeds: result.sellerProceeds,
  };
}
