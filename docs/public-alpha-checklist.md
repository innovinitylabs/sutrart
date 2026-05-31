# Public Alpha Validation Checklist (Ethereum Sepolia)

Release: `v0.1-alpha`

Purpose: Validate the sovereign creator commerce loop end-to-end on Ethereum Sepolia using real wallets and portable signed listing feeds.

How to use: Execute the checklist in order. Record observed issues and tx hashes. Stop only on a protocol-blocking failure.

## Deployment checklist (Sutrart contracts)

1. Configure environment
   - `SEPOLIA_RPC_URL` is set
   - `DEPLOYER_PRIVATE_KEY` is set
   - `GIT_COMMIT` is either set explicitly or derived from current HEAD

2. Deploy to Sepolia
   - Run: `pnpm contracts:deploy:sepolia`
   - Confirm that the deployment manifest is written to:
     - `packages/shared/src/deployments/sepolia.json`

3. Manifest validation
   - Validate manifest with: `pnpm manifest:validate`
   - Confirm:
     - `protocolVersion` equals `v0.1-alpha`
     - `deployedAt` is a positive unix timestamp
     - `gitCommit` is a real commit hash (not `undeployed` or `unknown`)
     - `SutrartMarket` and facet addresses are non-zero and checksummed

4. Facet registration sanity
   - Confirm `SignedListingFacet` is present
   - Confirm `ERC721RTFactoryFacet` is present
   - Confirm `ViewFacet` is present

5. Frontend chain resolution
   - Set `NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111` in `app/.env.local`
   - Reload:
     - `ChainStatus` shows Sepolia alpha
     - Market address resolves from the manifest
     - Unsupported-chain warning disappears

## Creator checklist (first demo collection)

Preconditions
- Wallet is connected on Sepolia.
- Creator address has deployment manifest resolved on this chain.

1. Deploy ERC721RT collection
   - Use the Creator dashboard.
   - Use real, coherent metadata inputs (IPFS/HTTPS).
   - Confirm:
     - Collection deployment tx is confirmed
     - Collection appears in creator inventory

2. Mint artwork
   - Mint multiple tokens (at least 2-3).
   - Confirm:
     - Token IDs increment correctly
     - Owned tokens reflect new mints

3. Approve the marketplace
   - Approve `SutrartMarket` for each token.
   - Confirm:
     - Approval state updates after tx.

4. Create signed listing(s)
   - Choose price and expiry (expiry optional; include at least one expiring soon listing).
   - Use preview payouts before signing.
   - Confirm:
     - Wallet displays readable EIP-712 signing request
     - Signed listing signature is produced without user confusion

5. Publish feed JSON
   - Export the creator feed JSON.
   - Confirm:
     - JSON serialization is deterministic
     - `protocolVersion` inside metadata is `v0.1-alpha`

## Feed hosting checklist (portable syndication)

Goal: Host a public feed URL that the storefront and marketplace can fetch.

1. Export feed JSON once it contains signed listing orders
2. Choose a public hosting option (one):
   - GitHub Pages
   - GitHub raw JSON (e.g. via a public repo)
   - Gist
   - Any stable HTTPS static hosting
3. Confirm the URL is reachable from an external device (not just localhost)
4. Deterministic URL
   - Keep the feed URL stable for the validation session

Wiring options
- If using server-side syndication: set `NEXT_PUBLIC_SIGNED_LISTING_FEED_URL` to the hosted feed URL.
- If using marketplace ingestion only: add the hosted feed URL inside the marketplace feed ingestion panel.

## Collector checklist (second wallet/device)

Preconditions
- Collector wallet is connected to Sepolia.
- Collector uses a second device or browser profile.

1. Ingest creator feed
   - Use marketplace feed ingestion or storefront syndication wiring.
   - Confirm:
     - Signed listing appears in unified inventory
     - Listing validity indicator shows valid results

2. Open canonical listing page
   - Open the listing detail route for:
     - signed listing canonical page
   - Confirm:
     - Buyer can see seller, token, validity, and canonical provenance

3. Preview payout
   - Confirm payout preview displays:
     - protocol fee
     - marketplace fee
     - royalty amount and recipient
     - seller proceeds

4. Fulfill signed listing
   - Buy using `buySignedListing`
   - Confirm:
     - NFT transfer succeeds
     - royalty routing succeeds (ERC2981)
     - protocol fee routing succeeds
     - marketplace fee routing succeeds (execution-time params)

5. Invalidation checks (signed listing)
   - After fulfillment, refresh discovery surfaces.
   - Confirm:
     - filled listing no longer appears as valid
     - stale listings are either hidden or clearly marked invalid

## Known limitations (alpha)

- Feed JSON is not separately authenticated at the feed level. Trust derives from EIP-712 signatures and onchain validation at purchase.
- Creator local feed storage (`localStorage`) is device-local. Cross-device syndication requires hosted feed URLs.
- Updating/diffing feed JSON does not revoke onchain signatures; nonce invalidation does.

## Recovery procedures

If deployment manifest fails resolution
1. Verify `NEXT_PUBLIC_DEFAULT_CHAIN_ID` matches `chainId` in `packages/shared/src/deployments/sepolia.json`.
2. Re-check manifest validation output.
3. Clear app caches and reload.

If feed fetch fails
1. Check feed URL is reachable via `curl` from an external network.
2. Ensure JSON is valid and follows the feed schema.
3. Confirm `protocolVersion` inside feed metadata matches `v0.1-alpha`.

If signed listing fails at purchase
1. Re-check:
   - token approval is set
   - listing is not expired
   - nonce has not been invalidated
2. Use payout preview to confirm expected values.

