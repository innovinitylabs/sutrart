# Mainnet Readiness Notes (Post Sepolia Alpha)

This document is planning-only. It records remaining trust assumptions and hardening work required before mainnet public sharing.

Release context: `v0.1-alpha` (Sepolia public alpha)

## Remaining trust assumptions (protocol)

1. Diamond upgrade authority
   - Alpha deployments assume the Diamond owner/deployer is trusted to manage upgrades.
   - Misconfigured upgrades could break listing validity or settlement logic.

2. Feed integrity model
   - Feeds are portable JSON manifests.
   - Feed JSON is not authenticated as a whole; each listing order relies on EIP-712 signatures and onchain validation.

3. Marketplace integration assumptions
   - Marketplace fee and recipient are supplied at execution time by the integrating surface.
   - Integrators must show payout previews and enforce fee caps.

## Upgradeability concerns

1. Storage layout compatibility
   - Each facet upgrade must preserve storage layout expected by the Diamond.
   - Storage layout diffs should be reviewed and documented per upgrade.

2. Selector collision risks
   - Diamond cuts must be constrained to intended selector sets.
   - Sanity checks should validate that critical functions keep working post-cut.

## Operational requirements (before mainnet)

1. Deployment manifest discipline
   - Manifests must be validated in CI and published with deterministic provenance.
   - Include:
     - `protocolVersion`
     - `gitCommit`
     - `deployedAt`
     - Diamond and facet addresses

2. Onchain validation coverage
   - Verify all listing invalidation paths:
     - nonce invalidation
     - approval revoked
     - ownership change
     - expiry handling
     - fill tracking

3. Frontend failure handling
   - Ensure UI never becomes misleading under:
     - stale feeds
     - unreachable feed URLs
     - malformed feed JSON
     - unexpected metadata fetch failures

## Security hardening needed

1. Formal third-party audit
   - Diamond + facets including:
     - signed listing domain separator correctness
     - nonce invalidation correctness
     - payout routing invariants
     - reentrancy and accounting correctness

2. Admin key controls
   - Move from a single deployer key to a multisig/timelock for `diamondCut`.
   - Document expected upgrade governance (even if not implemented yet in protocol).

## Scalability and indexing considerations

1. Discovery without centralized indexing
   - The protocol does not require a backend.
   - Operationally, marketplaces may still need client-side caching and/or local storage for feed URLs.

2. Feed hosting cost
   - Public feed hosting must support:
     - stable URLs for deterministic discovery
     - versioned manifests (optional)
     - recovery if hosting is temporarily unavailable

## Protocol freeze considerations

1. Release gating
   - Decide how to freeze protocol primitives for the alpha-to-beta step.
   - Ensure that signed feed schema and onchain EIP-712 assumptions remain stable.

2. Migration strategy
   - If signed feed schema changes, provide migration tooling and clear compatibility rules.

