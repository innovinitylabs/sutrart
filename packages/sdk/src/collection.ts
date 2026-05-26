import { abis } from "@sutrart/abi";
import type { Address, PublicClient, WalletClient } from "viem";

export type CreateCollectionParams = {
  name: string;
  symbol: string;
  baseURI: string;
  contractURI: string;
  royaltyRecipient: Address;
  royaltyBps: bigint;
};

export async function getCreatorCollections(
  publicClient: PublicClient,
  marketAddress: Address,
  creator: Address
): Promise<Address[]> {
  const collections = await publicClient.readContract({
    address: marketAddress,
    abi: abis.ERC721RTFactory,
    functionName: "getCreatorCollections",
    args: [creator],
  });

  return [...collections];
}

export async function getCollectionCreator(
  publicClient: PublicClient,
  marketAddress: Address,
  collection: Address
): Promise<Address> {
  return publicClient.readContract({
    address: marketAddress,
    abi: abis.ERC721RTFactory,
    functionName: "getCollectionCreator",
    args: [collection],
  });
}

export async function getCollectionNextTokenId(
  publicClient: PublicClient,
  collectionAddress: Address
): Promise<bigint> {
  return publicClient.readContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "nextTokenId",
  });
}

export async function getCollectionOwnedTokenIds(
  publicClient: PublicClient,
  collectionAddress: Address,
  owner: Address
): Promise<bigint[]> {
  const nextTokenId = await getCollectionNextTokenId(publicClient, collectionAddress);
  const ownedTokenIds: bigint[] = [];

  for (let tokenId = 1n; tokenId < nextTokenId; tokenId++) {
    const tokenOwner = await publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "ownerOf",
      args: [tokenId],
    });

    if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
      ownedTokenIds.push(tokenId);
    }
  }

  return ownedTokenIds;
}

export async function isCollectionOwner(
  publicClient: PublicClient,
  collectionAddress: Address,
  account: Address
): Promise<boolean> {
  const owner = await publicClient.readContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "owner",
  });

  return owner.toLowerCase() === account.toLowerCase();
}

export function buildCreateCollectionArgs(params: CreateCollectionParams) {
  return [
    params.name,
    params.symbol,
    params.baseURI,
    params.contractURI,
    params.royaltyRecipient,
    params.royaltyBps,
  ] as const;
}

export type CollectionWriteClients = {
  marketAddress: Address;
  walletClient: WalletClient;
};

export async function createCollection(
  clients: CollectionWriteClients,
  params: CreateCollectionParams
) {
  const account = clients.walletClient.account;
  if (!account) {
    throw new Error("Wallet account is required");
  }

  return clients.walletClient.writeContract({
    address: clients.marketAddress,
    abi: abis.ERC721RTFactory,
    functionName: "createCollection",
    args: buildCreateCollectionArgs(params),
    account,
    chain: clients.walletClient.chain,
  });
}

export async function mintCollectionToken(
  walletClient: WalletClient,
  collectionAddress: Address,
  to: Address
) {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account is required");
  }

  return walletClient.writeContract({
    address: collectionAddress,
    abi: abis.ERC721RT,
    functionName: "mint",
    args: [to],
    account,
    chain: walletClient.chain,
  });
}
