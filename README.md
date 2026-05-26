# Sutrart

Sutrart is a sovereign NFT listing and settlement protocol for Ethereum. Artists retain custody of their NFTs; listings are fully onchain; and marketplaces act as interfaces rather than escrow owners.

## Core principles

- Artists retain custody of NFTs
- No escrow marketplaces
- Listings are fully onchain (V1)
- One listing works across multiple marketplaces
- Listings invalidate globally after sale
- Artist-controlled royalties and composable marketplace fees
- Minimal, auditable protocol; no backend or database for V1

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

pnpm contracts:build
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Monorepo layout

| Path               | Package              | Purpose                                 |
| ------------------ | -------------------- | --------------------------------------- |
| `app/`             | `@sutrart/app`       | Next.js reference frontend              |
| `contracts/`       | `@sutrart/contracts` | Foundry Solidity protocol               |
| `packages/shared/` | `@sutrart/shared`    | Chains, env helpers, constants          |
| `packages/abi/`    | `@sutrart/abi`       | Contract ABIs (synced from Foundry)     |
| `packages/sdk/`    | `@sutrart/sdk`       | TypeScript SDK for protocol interaction |
| `docs/`            | —                    | Architecture and design notes           |

## Scripts

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `pnpm dev`             | Start Next.js dev server         |
| `pnpm build`           | Build workspace packages and app |
| `pnpm lint`            | Lint all packages                |
| `pnpm format`          | Format with Prettier             |
| `pnpm format:check`    | Check formatting                 |
| `pnpm contracts:build` | `forge build`                    |
| `pnpm contracts:test`  | `forge test`                     |
| `pnpm contracts:fmt`   | `forge fmt`                      |

## Environment variables

Copy `.env.example` to `app/.env.local`:

| Variable                               | Required          | Description                                          |
| -------------------------------------- | ----------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes (for wallets) | WalletConnect Cloud project ID                       |
| `NEXT_PUBLIC_APP_URL`                  | No                | Canonical app URL (default: `http://localhost:3000`) |

## Not included in this scaffold

- Authentication (SIWE, social login, etc.)
- Backend API, database, or indexing
- Marketplace or listing business logic
- Production deployment configuration

## Documentation

See [docs/architecture.md](docs/architecture.md) for monorepo boundaries and recommended next steps.

## License

UNLICENSED (private monorepo scaffold)
