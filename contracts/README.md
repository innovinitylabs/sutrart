# Sutrart Contracts

Foundry project for the Sutrart protocol on Ethereum.

## Philosophy

- Artists retain custody of NFTs (no escrow marketplaces)
- Listings are fully onchain for V1
- Protocol stays minimal and auditable

## Commands

From the repository root:

```bash
pnpm contracts:build
pnpm contracts:test
pnpm contracts:fmt
pnpm contracts:anvil
pnpm contracts:deploy:local
```

Or from this directory:

```bash
forge build
forge test
forge fmt
anvil
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Current MVP contracts

`src/diamond/Diamond.sol` is the deployed protocol entrypoint. Listing,
settlement, configuration, views, and ERC721RT collection deployment are split
across focused facets:

- sellers list while keeping NFT custody
- buyers purchase atomically with ETH + ERC721 transfer
- listings are invalidated globally after sale/cancel
- `isListingValid` protects against stale ownership/approval
- `previewPayouts` exposes canonical protocol, marketplace, royalty, and seller payouts
- `createCollection` deploys standalone creator-owned ERC721RT collections

`src/tokens/ERC721RT.sol` is the creator collection standard: ERC721 + ERC2981 with
owner-controlled minting and metadata configuration.

`src/MockERC721.sol` is a local test NFT with incremental minting.

## Local deployment

Terminal 1:

```bash
pnpm contracts:anvil
```

Terminal 2:

```bash
pnpm contracts:deploy:local
```

This writes addresses to `packages/shared/src/deployments/local.json` for the frontend.
