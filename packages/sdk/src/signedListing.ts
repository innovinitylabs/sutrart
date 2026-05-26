import { abis } from "@sutrart/abi";
import type { Address, PublicClient, WalletClient } from "viem";

export type SignedListing = {
  seller: Address;
  nftContract: Address;
  tokenId: bigint;
  price: bigint;
  expiry: bigint;
  nonce: bigint;
};

export const SUTRART_EIP712_DOMAIN = {
  name: "Sutrart",
  version: "1",
} as const;

export const SIGNED_LISTING_EIP712_TYPES = {
  SignedListing: [
    { name: "seller", type: "address" },
    { name: "nftContract", type: "address" },
    { name: "tokenId", type: "uint256" },
    { name: "price", type: "uint256" },
    { name: "expiry", type: "uint256" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

export async function getDomainSeparator(
  publicClient: PublicClient,
  marketAddress: Address
): Promise<`0x${string}`> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "domainSeparator",
  });
}

export async function getSignedListingMinNonce(
  publicClient: PublicClient,
  marketAddress: Address,
  seller: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "signedListingMinNonce",
    args: [seller],
  });
}

export async function hashSignedListing(
  publicClient: PublicClient,
  marketAddress: Address,
  listing: SignedListing
): Promise<`0x${string}`> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "hashSignedListing",
    args: [listing],
  });
}

export async function isSignedListingValid(
  publicClient: PublicClient,
  marketAddress: Address,
  listing: SignedListing
): Promise<boolean> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "isSignedListingValid",
    args: [listing],
  });
}

export async function previewSignedPayouts(
  publicClient: PublicClient,
  marketAddress: Address,
  listing: SignedListing,
  marketplaceFeeBps: bigint
) {
  const result = await publicClient.readContract({
    address: marketAddress,
    abi: abis.SutrartMarket,
    functionName: "previewSignedPayouts",
    args: [listing, marketplaceFeeBps],
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

export async function signSignedListing(
  walletClient: WalletClient,
  marketAddress: Address,
  listing: SignedListing,
  chainId: number
): Promise<`0x${string}`> {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet client account is required to sign a listing");
  }

  return walletClient.signTypedData({
    account,
    domain: {
      ...SUTRART_EIP712_DOMAIN,
      chainId,
      verifyingContract: marketAddress,
    },
    types: SIGNED_LISTING_EIP712_TYPES,
    primaryType: "SignedListing",
    message: listing,
  });
}
