function readPublicEnv(key: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  return process.env[key];
}

export function getWalletConnectProjectId(): string {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

  if (!projectId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[pari] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Wallet connection will not work."
      );
    }
    return "";
  }

  return projectId;
}

export function getAppUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}

/** Default chain for SSR and wallet initial chain. Falls back to Anvil (31337). */
export function getDefaultChainId(): number {
  const raw = readPublicEnv("NEXT_PUBLIC_DEFAULT_CHAIN_ID");
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 31337;
}

export function getSignedListingFeedUrl(): string | undefined {
  const url = readPublicEnv("NEXT_PUBLIC_SIGNED_LISTING_FEED_URL");
  return url && url.length > 0 ? url : undefined;
}

export function getPublicSepoliaRpcUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  return url && url.length > 0 ? url : undefined;
}

/** Server-side Sepolia RPC for SSR storefront reads. Falls back to viem chain defaults. */
export function getSepoliaRpcUrl(): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  const url = process.env.SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  return url && url.length > 0 ? url : undefined;
}

export function getPublicBaseSepoliaRpcUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL;
  return url && url.length > 0 ? url : undefined;
}

/** Server-side Base Sepolia RPC for SSR storefront reads. Falls back to viem chain defaults. */
export function getBaseSepoliaRpcUrl(): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  const url = process.env.BASE_SEPOLIA_RPC_URL ?? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL;
  return url && url.length > 0 ? url : undefined;
}
