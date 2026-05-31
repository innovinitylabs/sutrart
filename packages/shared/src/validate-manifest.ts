import { isAddress } from "viem";
import { PARI_PROTOCOL_VERSION } from "./constants";
import type { DeploymentFacets, DeploymentManifest } from "./deployments";

const REQUIRED_FACETS: (keyof DeploymentFacets)[] = [
  "DiamondCutFacet",
  "DiamondLoupeFacet",
  "OwnershipFacet",
  "ListingFacet",
  "SettlementFacet",
  "SignedListingFacet",
  "ProtocolConfigFacet",
  "ViewFacet",
  "ERC721RTFactoryFacet",
];

export type ManifestValidationIssue = {
  path: string;
  message: string;
};

export type ManifestValidationResult = {
  valid: boolean;
  issues: ManifestValidationIssue[];
};

export function validateDeploymentManifest(input: unknown): ManifestValidationResult {
  const issues: ManifestValidationIssue[] = [];

  if (!input || typeof input !== "object") {
    return { valid: false, issues: [{ path: "", message: "Manifest must be a JSON object" }] };
  }

  const manifest = input as Partial<DeploymentManifest>;

  if (typeof manifest.chainId !== "number" || manifest.chainId <= 0) {
    issues.push({ path: "chainId", message: "chainId must be a positive number" });
  }

  if (typeof manifest.chainName !== "string" || manifest.chainName.length === 0) {
    issues.push({ path: "chainName", message: "chainName is required" });
  }

  if (typeof manifest.protocolVersion !== "string" || manifest.protocolVersion.length === 0) {
    issues.push({ path: "protocolVersion", message: "protocolVersion is required" });
  } else if (manifest.protocolVersion !== PARI_PROTOCOL_VERSION) {
    issues.push({
      path: "protocolVersion",
      message: `Expected protocolVersion "${PARI_PROTOCOL_VERSION}", got "${manifest.protocolVersion}"`,
    });
  }

  if (typeof manifest.deployedAt !== "number" || manifest.deployedAt <= 0) {
    issues.push({ path: "deployedAt", message: "deployedAt must be a positive unix timestamp" });
  }

  if (typeof manifest.gitCommit !== "string" || manifest.gitCommit.length === 0) {
    issues.push({ path: "gitCommit", message: "gitCommit is required" });
  } else if (manifest.gitCommit === "undeployed" || manifest.gitCommit === "unknown") {
    issues.push({ path: "gitCommit", message: "gitCommit must be a real deployment commit hash" });
  }

  if (!manifest.PariMarket || !isAddress(manifest.PariMarket)) {
    issues.push({ path: "PariMarket", message: "PariMarket must be a valid address" });
  } else if (manifest.PariMarket === "0x0000000000000000000000000000000000000000") {
    issues.push({ path: "PariMarket", message: "PariMarket must not be the zero address" });
  }

  if (!manifest.facets || typeof manifest.facets !== "object") {
    issues.push({ path: "facets", message: "facets object is required" });
  } else {
    for (const facet of REQUIRED_FACETS) {
      const address = manifest.facets[facet];
      if (!address || !isAddress(address)) {
        issues.push({ path: `facets.${facet}`, message: `${facet} must be a valid address` });
      } else if (address === "0x0000000000000000000000000000000000000000") {
        issues.push({ path: `facets.${facet}`, message: `${facet} must not be the zero address` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
