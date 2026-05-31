# PARI

PARI is creator sovereignty, cultural provenance, storefront, syndication, and marketplace interoperability infrastructure. Creators retain custody of ERC721RT assets, publish portable signed listing feeds, and share a chain-native settlement engine.

**Public alpha:** `v0.1-alpha` on Ethereum Sepolia (see [docs/deployment.md](./docs/deployment.md))

## Core principles

- Creator sovereignty over collections and liquidity
- No centralized orderbook or marketplace backend
- Onchain listings + EIP-712 signed listings
- Shared Diamond settlement with runtime validation
- Portable feed syndication for discovery surfaces

## Documentation

| Doc | Description |
| --- | --- |
| [Protocol overview](./docs/protocol-overview.md) | Architecture and philosophy |
| [Creator flow](./docs/creator-flow.md) | End-to-end creator workflow |
| [Signed listings](./docs/signed-listings.md) | EIP-712 feeds and validation |
| [Storefronts](./docs/storefronts.md) | Sovereign storefront surfaces |
| [Marketplace integration](./docs/marketplace-integration.md) | Feed ingestion + settlement |
| [Deployment](./docs/deployment.md) | Anvil + Sepolia deploy runbook |
| [Security review](./docs/security-review.md) | Alpha assumptions and limits |
| [Gas observations](./docs/gas-observations.md) | Indicative gas notes |
| [Brand guidelines](./docs/brand-guidelines.md) | Immutable PARI brand standards |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`foundryup`)

## Quick start

```bash
corepack enable
pnpm install

cp .env.example app/.env.local
# Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (https://cloud.walletconnect.com/)

# Terminal 1
pnpm contracts:anvil

# Terminal 2
pnpm contracts:deploy:local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), connect wallet to Anvil (chain 31337), then use **Creator** and **Marketplace**.

### Sepolia alpha

```bash
# Configure SEPOLIA_RPC_URL + DEPLOYER_PRIVATE_KEY in .env
pnpm contracts:deploy:sepolia

# app/.env.local
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
pnpm dev
```

## Monorepo layout

| Path               | Package              | Purpose                                 |
| ------------------ | -------------------- | --------------------------------------- |
| `app/`             | `@pari/app`       | Next.js reference frontend              |
| `contracts/`       | `@pari/contracts` | Foundry Solidity protocol               |
| `packages/shared/` | `@pari/shared`    | Chains, env helpers, constants          |
| `packages/abi/`    | `@pari/abi`       | Contract ABIs (synced from Foundry)     |
| `packages/sdk/`    | `@pari/sdk`       | TypeScript SDK for protocol interaction |
| `docs/`            | —                    | Architecture and design notes           |

## Scripts

| Command                       | Description                       |
| ----------------------------- | --------------------------------- |
| `pnpm dev`                    | Start Next.js dev server          |
| `pnpm build`                  | Build workspace packages and app  |
| `pnpm lint`                   | Lint all packages                 |
| `pnpm format`                 | Format with Prettier              |
| `pnpm format:check`           | Check formatting                  |
| `pnpm contracts:build`        | `forge build` + ABI sync          |
| `pnpm contracts:test`         | `forge test`                      |
| `pnpm contracts:fmt`          | `forge fmt`                       |
| `pnpm contracts:anvil`        | Start local Anvil node            |
| `pnpm contracts:deploy:local` | Deploy to Anvil + write manifest |
| `pnpm contracts:deploy:sepolia` | Deploy to Sepolia + validate manifest |
| `pnpm manifest:validate` | Validate a deployment manifest JSON |
| `pnpm sdk:test` | Run SDK unit tests |

## Environment variables

Copy `.env.example` to `app/.env.local`:

| Variable                               | Required          | Description                                          |
| -------------------------------------- | ----------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes (for wallets) | WalletConnect Cloud project ID                       |
| `NEXT_PUBLIC_APP_URL`                  | No                | Canonical app URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID`         | No                | SSR/wallet default chain (`31337` or `11155111`)     |
| `NEXT_PUBLIC_SIGNED_LISTING_FEED_URL`  | No                | Hosted creator feed for SSR syndication              |
| `SEPOLIA_RPC_URL`                      | Sepolia deploy    | Sepolia RPC endpoint                                 |
| `DEPLOYER_PRIVATE_KEY`                 | Sepolia deploy    | Deployer private key                                 |

## Not Included

- Authentication (SIWE, social login, etc.)
- Backend API, database, or indexing
- Speculative trading or marketplace custody logic

## Documentation

See [docs/architecture.md](docs/architecture.md) for monorepo boundaries and recommended next steps.

## License

UNLICENSED (private monorepo scaffold)
