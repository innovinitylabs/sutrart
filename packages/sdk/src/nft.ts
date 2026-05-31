import { abis } from "@pari/abi";
import type { Address, PublicClient } from "viem";

export async function getNextTokenId(
  publicClient: PublicClient,
  nftAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: nftAddress,
    abi: abis.MockERC721,
    functionName: "nextTokenId",
  });
}

export async function getOwnedTokenIds(
  publicClient: PublicClient,
  nftAddress: Address,
  owner: Address
): Promise<bigint[]> {
  const nextTokenId = await getNextTokenId(publicClient, nftAddress);
  const ownedTokenIds: bigint[] = [];

  for (let tokenId = 1n; tokenId < nextTokenId; tokenId++) {
    const tokenOwner = await publicClient.readContract({
      address: nftAddress,
      abi: abis.MockERC721,
      functionName: "ownerOf",
      args: [tokenId],
    });

    if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
      ownedTokenIds.push(tokenId);
    }
  }

  return ownedTokenIds;
}

export async function isApprovedForMarket(
  publicClient: PublicClient,
  nftAddress: Address,
  marketAddress: Address,
  owner: Address,
  tokenId: bigint
): Promise<boolean> {
  const approved = await publicClient.readContract({
    address: nftAddress,
    abi: abis.MockERC721,
    functionName: "getApproved",
    args: [tokenId],
  });

  if (approved.toLowerCase() === marketAddress.toLowerCase()) {
    return true;
  }

  return publicClient.readContract({
    address: nftAddress,
    abi: abis.MockERC721,
    functionName: "isApprovedForAll",
    args: [owner, marketAddress],
  });
}
