import localDeployments from "./deployments/local.json" with { type: "json" };
import sepoliaDeployments from "./deployments/sepolia.json" with { type: "json" };

export type DeploymentFacets = {
  DiamondCutFacet?: `0x${string}`;
  DiamondLoupeFacet?: `0x${string}`;
  OwnershipFacet?: `0x${string}`;
  ListingFacet?: `0x${string}`;
  SettlementFacet?: `0x${string}`;
  SignedListingFacet?: `0x${string}`;
  ProtocolConfigFacet?: `0x${string}`;
  ViewFacet?: `0x${string}`;
  ERC721RTFactoryFacet?: `0x${string}`;
};

export type DeploymentManifest = {
  chainId: number;
  chainName: string;
  protocolVersion: string;
  gitCommit?: string;
  deployedAt: number;
  PariMarket: `0x${string}`;
  MockERC721?: `0x${string}`;
  facets?: DeploymentFacets;
};

export type SupportedDeployment = DeploymentManifest;

export const localDeployment = localDeployments as DeploymentManifest;
export const sepoliaDeployment = sepoliaDeployments as DeploymentManifest;

const deploymentsByChainId: Record<number, DeploymentManifest> = {
  [localDeployment.chainId]: localDeployment,
  [sepoliaDeployment.chainId]: sepoliaDeployment,
};

export const supportedDeploymentChainIds = Object.keys(deploymentsByChainId).map(Number);

export function getDeploymentManifest(chainId: number): DeploymentManifest | null {
  const manifest = deploymentsByChainId[chainId];
  if (!manifest) {
    return null;
  }

  if (
    !manifest.PariMarket ||
    manifest.PariMarket === "0x0000000000000000000000000000000000000000"
  ) {
    return null;
  }

  return manifest;
}

export function getContractAddress(
  chainId: number,
  contract: "PariMarket" | "MockERC721"
): `0x${string}` | null {
  const manifest = getDeploymentManifest(chainId);
  if (!manifest) {
    return null;
  }

  const address = manifest[contract];
  if (!address || address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  return address;
}

export function isSupportedDeploymentChain(chainId: number): boolean {
  return getDeploymentManifest(chainId) !== null;
}

export function getChainDisplayName(chainId: number): string {
  const manifest = deploymentsByChainId[chainId];
  if (manifest?.chainName) {
    return manifest.chainName;
  }

  if (chainId === 11155111) {
    return "sepolia";
  }

  if (chainId === 31337) {
    return "anvil";
  }

  return `chain-${chainId}`;
}

export type LocalDeployment = DeploymentManifest;
export function getDeployments(chainId: number): DeploymentManifest | null {
  return getDeploymentManifest(chainId);
}
