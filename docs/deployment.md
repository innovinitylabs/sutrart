# Deployment

PARI supports deterministic Diamond deployment with JSON manifests for local Anvil and Ethereum Sepolia.

**Protocol version:** `v0.1-alpha`

## Manifest schema

```json
{
  "chainId": 11155111,
  "chainName": "sepolia",
  "protocolVersion": "v0.1-alpha",
  "gitCommit": "abc123...",
  "deployedAt": 1710000000,
  "PariMarket": "0x...",
  "MockERC721": "0x...",
  "facets": {
    "DiamondCutFacet": "0x...",
    "DiamondLoupeFacet": "0x...",
    "OwnershipFacet": "0x...",
    "ListingFacet": "0x...",
    "SettlementFacet": "0x...",
    "SignedListingFacet": "0x...",
    "ProtocolConfigFacet": "0x...",
    "ViewFacet": "0x...",
    "ERC721RTFactoryFacet": "0x..."
  }
}
```

Manifests live in `packages/shared/src/deployments/`.

`getDeploymentManifest(chainId)` returns `null` when `PariMarket` is zero — Sepolia placeholder starts undeployed.

## Local Anvil

```bash
pnpm contracts:anvil          # terminal 1
pnpm contracts:deploy:local    # terminal 2
pnpm dev                       # terminal 3
```

Writes `packages/shared/src/deployments/local.json`.

Deploy script runs post-deploy sanity checks:

- Facet count via DiamondLoupe
- Core facet addresses non-zero
- EIP-712 domain separator initialized

## Ethereum Sepolia

Configure root or `contracts/.env`:

```env
SEPOLIA_RPC_URL=https://...
DEPLOYER_PRIVATE_KEY=0x...
```

Deploy:

```bash
pnpm contracts:deploy:sepolia
```

This:

1. Sets `GIT_COMMIT` from current HEAD
2. Broadcasts `DeploySepolia.s.sol`
3. Writes `packages/shared/src/deployments/sepolia.json`
4. Builds `@pari/shared`
5. Validates manifest via `scripts/validate-deployment-manifest.mjs`

## Frontend chain config

For Sepolia alpha testing in the app:

```env
# app/.env.local
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_APP_URL=https://your-preview-url
```

Optional hosted feed for SSR syndication:

```env
NEXT_PUBLIC_SIGNED_LISTING_FEED_URL=https://...
```

## Manifest validation

```bash
pnpm --filter @pari/shared build
node scripts/validate-deployment-manifest.mjs packages/shared/src/deployments/sepolia.json
```

Validation checks:

- Required fields present
- `protocolVersion === v0.1-alpha`
- Non-zero Diamond + facet addresses
- Real `gitCommit` (not `undeployed`)

## Upgrade notes

The Diamond supports facet replacement via `DiamondCutFacet`. Alpha deployments treat the Diamond owner as the upgrade authority. Document any facet upgrades with a new manifest `gitCommit` and `deployedAt`.

## End-to-end validation flow

After Sepolia deploy:

```text
deploy collection → mint → approve → sign listing → publish feed
→ ingest feed → storefront discovery → collector purchase
→ verify payout + royalty + protocol fee routing
```

Use two wallets on Sepolia. Confirm manifests resolve in the app chain status panel.

See [creator flow](./creator-flow.md) and [gas observations](./gas-observations.md).
