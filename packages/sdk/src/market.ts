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

export type FeeSplit = {
  protocolFeePaid: bigint;
  marketplaceFeePaid: bigint;
  sellerProceeds: bigint;
};

export function calculateFeeSplits(
  grossPrice: bigint,
  protocolFeeBps: bigint,
  marketplaceFeeBps: bigint
): FeeSplit {
  const protocolFeePaid = (grossPrice * protocolFeeBps) / 10_000n;
  const marketplaceFeePaid = (grossPrice * marketplaceFeeBps) / 10_000n;
  const totalFees = protocolFeePaid + marketplaceFeePaid;

  if (totalFees > grossPrice) {
    throw new Error("Fee split exceeds gross price");
  }

  return {
    protocolFeePaid,
    marketplaceFeePaid,
    sellerProceeds: grossPrice - totalFees,
  };
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
        abi: abis.SutrartMarket,
        functionName: "protocolFeeBps",
      }),
      publicClient.readContract({
        address: marketAddress,
        abi: abis.SutrartMarket,
        functionName: "protocolTreasury",
      }),
      publicClient.readContract({
        address: marketAddress,
        abi: abis.SutrartMarket,
        functionName: "MAX_PROTOCOL_FEE_BPS",
      }),
      publicClient.readContract({
        address: marketAddress,
        abi: abis.SutrartMarket,
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

export async function estimatePayouts(
  publicClient: PublicClient,
  marketAddress: Address,
  grossPrice: bigint,
  marketplaceFeeBps: bigint
): Promise<FeeSplit> {
  const config = await getProtocolFeeConfig(publicClient, marketAddress);
  // Contract enforces caps; we replicate the key checks for UI clarity.
  if (marketplaceFeeBps > config.maxMarketplaceFeeBps) {
    throw new Error("Marketplace fee too high");
  }

  return calculateFeeSplits(grossPrice, config.protocolFeeBps, marketplaceFeeBps);
}
