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
forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae7827d738f0e05
```

## Current MVP contracts

`src/SutrartMarket.sol` is the first listing registry primitive:

- sellers list while keeping NFT custody
- buyers purchase atomically with ETH + ERC721 transfer
- listings are invalidated globally after sale/cancel
- `isListingValid` protects against stale ownership/approval

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
