import { describe, expect, it } from "vitest";
import {
  PARI_PROTOCOL_VERSION,
  validateDeploymentManifest,
} from "@pari/shared";

describe("validateDeploymentManifest", () => {
  it("rejects undeployed sepolia placeholder", () => {
    const result = validateDeploymentManifest({
      chainId: 11155111,
      chainName: "sepolia",
      protocolVersion: PARI_PROTOCOL_VERSION,
      gitCommit: "undeployed",
      deployedAt: 0,
      PariMarket: "0x0000000000000000000000000000000000000000",
      facets: {},
    });

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("accepts a complete manifest shape", () => {
    const zero = "0x0000000000000000000000000000000000000001";
    const result = validateDeploymentManifest({
      chainId: 11155111,
      chainName: "sepolia",
      protocolVersion: PARI_PROTOCOL_VERSION,
      gitCommit: "abc123def456",
      deployedAt: 1_700_000_000,
      PariMarket: zero,
      facets: {
        DiamondCutFacet: zero,
        DiamondLoupeFacet: zero,
        OwnershipFacet: zero,
        ListingFacet: zero,
        SettlementFacet: zero,
        SignedListingFacet: zero,
        ProtocolConfigFacet: zero,
        ViewFacet: zero,
        ERC721RTFactoryFacet: zero,
      },
    });

    expect(result.valid).toBe(true);
  });

  it("rejects wrong protocol version", () => {
    const zero = "0x0000000000000000000000000000000000000001";
    const result = validateDeploymentManifest({
      chainId: 31337,
      chainName: "anvil",
      protocolVersion: "1",
      gitCommit: "abc123",
      deployedAt: 1,
      PariMarket: zero,
      facets: {
        DiamondCutFacet: zero,
        DiamondLoupeFacet: zero,
        OwnershipFacet: zero,
        ListingFacet: zero,
        SettlementFacet: zero,
        SignedListingFacet: zero,
        ProtocolConfigFacet: zero,
        ViewFacet: zero,
        ERC721RTFactoryFacet: zero,
      },
    });

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === "protocolVersion")).toBe(true);
  });
});
