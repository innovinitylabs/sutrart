import { abis } from "@pari/abi";
import type { Address, PublicClient } from "viem";

export type CollectionMetadataDocument = {
  name?: string;
  description?: string;
  image?: string;
  banner_image?: string;
  external_link?: string;
};

export type NormalizedCollectionMetadata = {
  address: Address;
  name: string;
  symbol: string;
  contractURI: string | null;
  document: CollectionMetadataDocument | null;
  image: string | null;
  bannerImage: string | null;
  description: string | null;
  externalLink: string | null;
  fallback: boolean;
};

export function normalizeCollectionMetadataDocument(
  input: unknown
): CollectionMetadataDocument | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const document = input as Record<string, unknown>;
  const normalized: CollectionMetadataDocument = {};

  if (typeof document.name === "string" && document.name.length > 0) {
    normalized.name = document.name;
  }

  if (typeof document.description === "string" && document.description.length > 0) {
    normalized.description = document.description;
  }

  if (typeof document.image === "string" && document.image.length > 0) {
    normalized.image = document.image;
  }

  if (typeof document.banner_image === "string" && document.banner_image.length > 0) {
    normalized.banner_image = document.banner_image;
  }

  if (typeof document.external_link === "string" && document.external_link.length > 0) {
    normalized.external_link = document.external_link;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export async function fetchCollectionMetadataDocument(
  contractURI: string
): Promise<CollectionMetadataDocument | null> {
  if (!contractURI) {
    return null;
  }

  try {
    const response = await fetch(contractURI, { signal: AbortSignal.timeout(8_000) });

    if (!response.ok) {
      return null;
    }

    const json: unknown = await response.json();
    return normalizeCollectionMetadataDocument(json);
  } catch (error) {
    console.warn("[pari] Collection metadata fetch failed.", {
      contractURI,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function getCollectionChainMetadata(
  publicClient: PublicClient,
  collectionAddress: Address
): Promise<{ name: string; symbol: string; contractURI: string | null }> {
  const [name, symbol, contractURI] = await Promise.all([
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
    publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "contractURI",
    }),
  ]);

  return {
    name,
    symbol,
    contractURI: contractURI || null,
  };
}

export async function getNormalizedCollectionMetadata(
  publicClient: PublicClient,
  collectionAddress: Address
): Promise<NormalizedCollectionMetadata> {
  const chainMetadata = await getCollectionChainMetadata(publicClient, collectionAddress);
  const document = chainMetadata.contractURI
    ? await fetchCollectionMetadataDocument(chainMetadata.contractURI)
    : null;

  const resolvedName = document?.name ?? chainMetadata.name;
  const resolvedDescription = document?.description ?? null;
  const resolvedImage = document?.image ?? null;
  const resolvedBanner = document?.banner_image ?? null;
  const resolvedExternalLink = document?.external_link ?? null;

  return {
    address: collectionAddress,
    name: resolvedName,
    symbol: chainMetadata.symbol,
    contractURI: chainMetadata.contractURI,
    document,
    image: resolvedImage,
    bannerImage: resolvedBanner,
    description: resolvedDescription,
    externalLink: resolvedExternalLink,
    fallback: document === null,
  };
}

export async function getTokenURI(
  publicClient: PublicClient,
  collectionAddress: Address,
  tokenId: bigint
): Promise<string | null> {
  try {
    const tokenURI = await publicClient.readContract({
      address: collectionAddress,
      abi: abis.ERC721RT,
      functionName: "tokenURI",
      args: [tokenId],
    });

    return tokenURI || null;
  } catch (error) {
    console.warn("[pari] tokenURI readContract failed.", {
      collectionAddress,
      tokenId: tokenId.toString(),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
