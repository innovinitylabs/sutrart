export const PARI_BRAND = {
  protocolName: "PARI",
  protocolVersion: "v0.1-alpha",
  eip712Name: "PARI",
  identity: [
    "creator sovereignty infrastructure",
    "cultural provenance protocol",
    "storefront infrastructure",
    "syndication infrastructure",
    "marketplace interoperability protocol",
  ],
  not: ["crypto casino", "NFT flipping platform", "speculative trading platform"],
  colors: {
    dark: {
      background: "#0D0D0F",
      surface: "#1A1A1D",
      primaryGold: "#C9A56A",
      goldHover: "#D8B57A",
      brightText: "#F2EFEA",
      secondaryText: "#B7B1A8",
      border: "#2C2C31",
      glow: "rgba(201,165,106,0.15)",
    },
    light: {
      paper: "#F7F4EE",
      white: "#FFFFFF",
      primaryText: "#171717",
      secondaryText: "#686868",
      accentDark: "#222222",
    },
  },
  logoAssets: {
    wordmark: "/pari-wordmark-final.svg",
    mark: "/Pari_logo_final.svg",
  },
  usage: {
    desktopNavigation: "wordmark",
    mobileNavigation: "mark",
    favicon: "mark",
    appIcon: "mark",
    loading: "mark",
    footer: "single-asset",
    hero: "single-asset",
    marketing: "single-asset",
  },
  principle: "Gold indicates significance, not decoration.",
} as const;

export type PariBrand = typeof PARI_BRAND;
