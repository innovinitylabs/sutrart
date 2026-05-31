# Storefronts

PARI storefronts are sovereign, shareable surfaces for creator inventory and listings.

## Routes

| Route | Purpose |
|-------|---------|
| `/creator/[address]` | Creator storefront — collections, listed/unlisted inventory |
| `/collection/[address]` | Collection detail + metadata |
| `/listing/onchain/[listingId]` | Canonical onchain listing page |
| `/listing/signed/[listingHash]` | Canonical signed listing page |

## Data sources

Storefront pages merge chain-native state:

1. **Collections** — `getCreatorCollections` from factory facet
2. **Onchain listings** — Diamond view functions + validity checks
3. **Signed listings** — portable feeds + onchain validation

No backend aggregation is required. SSR reads onchain data via RPC. Client components can augment with localStorage feeds.

## Syndication

### Server-side feed URL

Set in `app/.env.local`:

```env
NEXT_PUBLIC_SIGNED_LISTING_FEED_URL=https://your-domain/pari-feed.json
```

The storefront loader fetches this URL during SSR when configured.

### Client-side local feed

`CreatorStorefrontSyndication` reads the creator's browser-local feed for same-device testing. For public sharing, export and host feed JSON.

## Storefront metadata

Public pages display:

- Creator address
- Collection names/descriptions (from `contractURI` when resolvable)
- Listing type (onchain / signed)
- Price and canonical listing links
- Protocol version (`v0.1-alpha`)

## Embeds

Storefront commerce components (`ListingPurchasePanel`, `BuyButton`, `ListingProvenancePanel`) can be composed into custom surfaces. They call the same SDK + settlement paths as the reference app.

## Chain resolution

SSR uses `NEXT_PUBLIC_DEFAULT_CHAIN_ID` (default `31337` Anvil). For Sepolia alpha:

```env
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
```

Wallet-connected flows resolve manifests from the active wallet chain.

## Presentation guidelines

- Use real IPFS or HTTPS metadata before public demos
- Ensure royalty recipients are set on collection deployment
- Verify listing validity indicators before sharing purchase links

See [creator flow](./creator-flow.md).
