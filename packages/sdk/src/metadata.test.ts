import { describe, expect, it } from "vitest";
import { normalizeCollectionMetadataDocument } from "./metadata.js";

describe("normalizeCollectionMetadataDocument", () => {
  it("returns null for invalid input", () => {
    expect(normalizeCollectionMetadataDocument(null)).toBeNull();
    expect(normalizeCollectionMetadataDocument("bad")).toBeNull();
    expect(normalizeCollectionMetadataDocument({})).toBeNull();
  });

  it("normalizes known metadata fields", () => {
    expect(
      normalizeCollectionMetadataDocument({
        name: "Collection",
        description: "Desc",
        image: "ipfs://image",
        banner_image: "ipfs://banner",
        external_link: "https://example.com",
      })
    ).toEqual({
      name: "Collection",
      description: "Desc",
      image: "ipfs://image",
      banner_image: "ipfs://banner",
      external_link: "https://example.com",
    });
  });

  it("ignores empty strings", () => {
    expect(
      normalizeCollectionMetadataDocument({
        name: "",
        image: "ipfs://image",
      })
    ).toEqual({
      image: "ipfs://image",
    });
  });
});
