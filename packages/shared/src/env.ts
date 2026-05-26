function readPublicEnv(key: string): string | undefined {
  if (typeof process === "undefined") {
    return undefined;
  }
  return process.env[key];
}

export function getWalletConnectProjectId(): string {
  const projectId = readPublicEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");

  if (!projectId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[sutrart] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Wallet connection will not work."
      );
    }
    return "";
  }

  return projectId;
}

export function getAppUrl(): string {
  return readPublicEnv("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}
