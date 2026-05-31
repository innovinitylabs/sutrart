# PARI Protocol Overview

PARI is creator sovereignty, cultural provenance, storefront, syndication, and marketplace interoperability infrastructure built on Ethereum. It provides shared settlement infrastructure while keeping listing liquidity creator-owned and portable.

**Release:** `v0.1-alpha` (Sepolia public alpha)

## Design principles

- **Creator sovereignty** — Creators deploy ERC721RT collections, control metadata, and publish their own listing liquidity.
- **Portable liquidity** — Signed listings are EIP-712 intents distributed via JSON feeds, not a centralized orderbook.
- **Shared settlement** — One ERC-2535 Diamond market contract validates and settles purchases onchain.
- **Runtime validation** — Listings are checked at execution time (ownership, approval, expiry, nonce, signature).
- **Marketplace-agnostic** — Any surface can ingest feeds and call the same settlement functions.

## Architecture

```text
Creator wallet
  ├─ ERC721RT collections (factory facet)
  ├─ Onchain listings (ListingFacet)
  └─ Signed listings (SignedListingFacet + portable feeds)

Collector wallet
  └─ buyListing / buySignedListing (SettlementFacet)

Shared Diamond (PariMarket)
  ├─ ListingFacet
  ├─ SignedListingFacet
  ├─ SettlementFacet
  ├─ ProtocolConfigFacet
  ├─ ViewFacet
  └─ ERC721RTFactoryFacet
```

## What PARI is not

- Not a centralized marketplace backend
- Not a crypto casino
- Not an NFT flipping platform
- Not a speculative trading platform
- Not a recommendation engine or social graph
- Not an orderbook or matching engine
- Not account abstraction (no ERC-4337 / ERC-7579 in this release)

## Core objects

| Object | Description |
|--------|-------------|
| ERC721RT collection | Creator-owned ERC721 + ERC2981 royalty collection |
| Onchain listing | Listing stored in Diamond storage |
| Signed listing | Offchain EIP-712 order validated onchain at purchase |
| Signed listing feed | Portable JSON manifest of signed orders |
| Deployment manifest | Chain-specific Diamond + facet addresses |

## Validation model

All listings — onchain or signed — must pass runtime checks before purchase:

- Seller still owns the token
- Marketplace is approved to transfer the token
- Listing is active / not expired / nonce not invalidated
- Signature matches Diamond domain separator (signed listings)

## Protocol version

The current alpha release identifier is `v0.1-alpha`. It appears in:

- Deployment manifests (`protocolVersion`)
- Signed listing feed metadata
- Frontend chain status UI

This is separate from the EIP-712 signing domain version (`"1"`) used inside `LibPariEIP712`.

## Monorepo layout

| Package | Role |
|---------|------|
| `contracts/` | Foundry Diamond + facets |
| `packages/abi/` | Generated ABIs |
| `packages/shared/` | Chain config, deployment manifests |
| `packages/sdk/` | Chain-first protocol SDK |
| `app/` | Next.js reference frontend |

See also: [deployment](./deployment.md), [signed listings](./signed-listings.md), [security review](./security-review.md).
