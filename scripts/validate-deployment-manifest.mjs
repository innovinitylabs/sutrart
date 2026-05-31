#!/usr/bin/env node
import { readFileSync } from "node:fs";

const PROTOCOL_VERSION = "v0.1-alpha";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function isEthAddress(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

const REQUIRED_FACETS = [
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

function validateDeploymentManifest(input) {
  const issues = [];

  if (!input || typeof input !== "object") {
    return { valid: false, issues: [{ path: "", message: "Manifest must be a JSON object" }] };
  }

  if (typeof input.chainId !== "number" || input.chainId <= 0) {
    issues.push({ path: "chainId", message: "chainId must be a positive number" });
  }

  if (typeof input.chainName !== "string" || input.chainName.length === 0) {
    issues.push({ path: "chainName", message: "chainName is required" });
  }

  if (typeof input.protocolVersion !== "string" || input.protocolVersion.length === 0) {
    issues.push({ path: "protocolVersion", message: "protocolVersion is required" });
  } else if (input.protocolVersion !== PROTOCOL_VERSION) {
    issues.push({
      path: "protocolVersion",
      message: `Expected protocolVersion "${PROTOCOL_VERSION}", got "${input.protocolVersion}"`,
    });
  }

  if (typeof input.deployedAt !== "number" || input.deployedAt <= 0) {
    issues.push({ path: "deployedAt", message: "deployedAt must be a positive unix timestamp" });
  }

  if (typeof input.gitCommit !== "string" || input.gitCommit.length === 0) {
    issues.push({ path: "gitCommit", message: "gitCommit is required" });
  } else if (input.gitCommit === "undeployed" || input.gitCommit === "unknown") {
    issues.push({ path: "gitCommit", message: "gitCommit must be a real deployment commit hash" });
  }

  if (!input.SutrartMarket || !isEthAddress(input.SutrartMarket)) {
    issues.push({ path: "SutrartMarket", message: "SutrartMarket must be a valid address" });
  } else if (input.SutrartMarket.toLowerCase() === ZERO_ADDRESS) {
    issues.push({ path: "SutrartMarket", message: "SutrartMarket must not be the zero address" });
  }

  if (!input.facets || typeof input.facets !== "object") {
    issues.push({ path: "facets", message: "facets object is required" });
  } else {
    for (const facet of REQUIRED_FACETS) {
      const address = input.facets[facet];
      if (!address || !isEthAddress(address)) {
        issues.push({ path: `facets.${facet}`, message: `${facet} must be a valid address` });
      } else if (address.toLowerCase() === ZERO_ADDRESS) {
        issues.push({ path: `facets.${facet}`, message: `${facet} must not be the zero address` });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

const manifestPath = process.argv[2];

if (!manifestPath) {
  console.error("Usage: node scripts/validate-deployment-manifest.mjs <manifest.json>");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const result = validateDeploymentManifest(manifest);

if (!result.valid) {
  console.error(`Manifest validation failed: ${manifestPath}`);
  for (const issue of result.issues) {
    console.error(`  ${issue.path || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

console.log(`Manifest valid: ${manifestPath}`);
console.log(`  chainId: ${manifest.chainId}`);
console.log(`  chainName: ${manifest.chainName}`);
console.log(`  protocolVersion: ${manifest.protocolVersion}`);
console.log(`  SutrartMarket: ${manifest.SutrartMarket}`);
